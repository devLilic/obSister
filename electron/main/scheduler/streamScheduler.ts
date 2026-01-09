// filepath: electron/main/scheduler/streamScheduler.ts
import fs from "fs";
import path from "path";
import { app, BrowserWindow } from "electron";
import { getMainWindow, obs } from "../obs/connection";
import { ensureProfile } from "../obs/profile";
import { startStream as startFacebookStream, stopStream as stopObsStream } from "../obs/controller";
import { logInfo, logWarn, logError, logAction } from "../config/logger";
import { ScheduleItem } from "../../types/types";
import { markScheduleItemSkipped } from "../schedule/store";
import {
  setActiveScheduleItemId,
  getStreamEndReason,
  getActiveScheduleItemId,
  getStreamState,
  setStreamState,
  markLive,
} from "../stream/streamTruth";

type Platform = ScheduleItem["platform"];

let failureCount = 0;
const MAX_FAILURES = 5;
let pausedDueToFailures = false;
const warnedNoKey = new Set<string>();

/** Where we store the user’s schedule */
const schedulePath = path.join(app.getPath("userData"), "schedule.json");

/** Profiles to use per platform (tweak these names to match your OBS) */
const PROFILE_FOR: Record<Platform, string> = {
  facebook: "SingleStream",
  youtube: "SingleStream",
  multi: "MultiStream",
};

function loadSchedule(): ScheduleItem[] {
  try {
    if (!fs.existsSync(schedulePath)) return [];
    const data = JSON.parse(fs.readFileSync(schedulePath, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch (e: any) {
    logError(`schedule.json read failed: ${e.message}`);
    return [];
  }
}

async function safeCall<T>(fn: () => Promise<T>, context: string): Promise<T | null> {
  try {
    const result = await fn();
    failureCount = 0;
    return result;
  } catch (err: any) {
    failureCount++;
    logError(`❌ Scheduler error during ${context}: ${err.message || err}`);
    if (failureCount >= MAX_FAILURES) {
      pausedDueToFailures = true;
      logError(`⚠️ Scheduler paused after ${failureCount} consecutive failures.`);
      const win = getMainWindow();
      win?.webContents.send("scheduler-paused", {
        reason: "too many errors",
        count: failureCount,
      });
    }
    return null;
  }
}

function iso(s: string) {
  return new Date(s);
}
function addMinutes(d: Date, m: number) {
  return new Date(d.getTime() + m * 60000);
}

let tickTimer: NodeJS.Timeout | null = null;

/** simple in-memory state so we don’t double-start/stop */
const state = {
  activeId: null as string | null,
  isStreaming: false,
};

function resetSchedulerLocalState(reason: string) {
  state.activeId = null;
  state.isStreaming = false;
  setActiveScheduleItemId(null);

  // normalize ended -> idle when nothing active
  if (getStreamState() === "ended") {
    setStreamState("idle");
  }

  logInfo(`🧩 Scheduler: local state reset (${reason})`);
}

async function startForItem(item: ScheduleItem) {
  try {
    // If this exact item previously ended due to OBS crash, do not attempt restart.
    if (getStreamEndReason() === "obs_crash" && getActiveScheduleItemId() === item.id) {
      logWarn(`⛔ Scheduler: blocked restart for "${item.name}" due to previous OBS crash.`);
      return;
    }

    const profile = PROFILE_FOR[item.platform];
    const ok = await ensureProfile(profile);
    if (!ok) {
      logError(`Scheduler: profile "${profile}" not available; cannot start "${item.name}"`);
      return;
    }

    if (item.platform === "facebook" || item.platform === "multi") {
      if (!item.fbKey) {
        logWarn(`Scheduler: "${item.name}" needs a Facebook key but none provided`);
        return;
      }
      await startFacebookStream(item.fbKey);
    } else {
      await obs.call("StartStream");
    }

    state.activeId = item.id;
    state.isStreaming = true;

    setActiveScheduleItemId(item.id);
    markLive();

    logInfo(`▶️ Scheduler started stream: ${item.name} (${item.platform})`);
  } catch (e: any) {
    logError(`Scheduler start failed for "${item.name}": ${e.message}`);
  }
}

async function stopIfStreaming(reason: string) {
  try {
    // Scheduler stop is tagged as duration (as per spec)
    await stopObsStream("duration");
  } catch (e: any) {
    logWarn(`Scheduler stop warning: ${e.message}`);
  } finally {
    logInfo(`⏹ Scheduler stopped stream (${reason})`);
    resetSchedulerLocalState("stopIfStreaming");
  }
}

/** core clock: checks schedule every 5 seconds */
async function tick(_win?: BrowserWindow) {
  if (pausedDueToFailures) {
    logWarn("⏸ Scheduler paused due to repeated errors.");
    return;
  }

  const list = loadSchedule();
  const now = new Date();
  let current: ScheduleItem | undefined;

  // find the active item
  for (const item of list) {
    const start = iso(item.startTime);
    const end = addMinutes(start, item.durationMinutes);
    const auto = item.autoStart !== false;

    // PHASE 3: skip terminated/skipped items
    if (item.status === "terminated" || item.status === "skipped") continue;
    if (!auto) continue;

    if (now >= start && now < end) {
      current = item;
      break;
    }
  }

  // ✅ No current item
  if (!current) {
    if (state.isStreaming) {
      const rt = getStreamState();
      if (rt === "live" || rt === "ending") {
        await safeCall(() => stopIfStreaming("no scheduled item active"), "stop unscheduled");
      } else {
        resetSchedulerLocalState("already ended (skip duplicate stop)");
      }
    } else {
      if (getStreamState() === "ended") {
        setStreamState("idle");
      }
    }
    return;
  }

  // ✅ Current item found — check if it has a Facebook key
  if (!current.fbKey || !current.fbKey.trim()) {
    if (!warnedNoKey.has(current.id)) {
      logWarn(`Scheduler: "${current.name}" needs a Facebook key but none provided`);
      warnedNoKey.add(current.id);
    }
    if (state.isStreaming && state.activeId === current.id) {
      const rt = getStreamState();
      if (rt === "live" || rt === "ending") {
        await safeCall(() => stopIfStreaming("missing FB key"), "stop missing key");
      } else {
        resetSchedulerLocalState("already ended (missing key branch)");
      }
    }
    return;
  }

  // ✅ Guard “No double start”
  // Before auto-start, if runtime truth is already live/ending -> do NOT start.
  if (!state.isStreaming || state.activeId !== current.id) {
    const rt = getStreamState();
    if (rt === "live" || rt === "ending") {
      logAction("auto_start_blocked_already_live", {
        itemId: current.id,
        itemName: current.name,
        streamState: rt,
        skipReason: "already_live_manual",
      });

      // Mark this schedule item skipped for this run window (persisted).
      markScheduleItemSkipped(current.id, "already_live_manual");
      return; // scheduler continues on next ticks with next items
    }

    await safeCall(() => startForItem(current as ScheduleItem), `start ${current.name}`);
    return;
  }

  // ✅ Already streaming same item — check if duration elapsed
  const end = addMinutes(iso(current.startTime), current.durationMinutes);
  if (now >= end) {
    await safeCall(() => stopIfStreaming("duration elapsed"), "stop after duration");
  }
}

export function startStreamScheduler(win?: BrowserWindow) {
  if (tickTimer) return; // already running
  logInfo("🗓️ Scheduler: started");
  setTimeout(() => tick(win), 1500);
  tickTimer = setInterval(() => tick(win), 5000);
}

export function stopStreamScheduler() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
  logInfo("🗓️ Scheduler: stopped");
}
