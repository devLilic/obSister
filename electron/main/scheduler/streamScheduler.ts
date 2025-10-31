// electron/main/scheduler/streamScheduler.ts
import fs from "fs";
import path from "path";
import { app, BrowserWindow } from "electron";
import { getMainWindow, obs } from "../obs/connection";
import { ensureProfile } from "../obs/profile";
import { startStream as startFacebookStream, stopStream as stopObsStream } from "../obs/controller";
import { logInfo, logWarn, logError } from "../config/logger";
import { ScheduleItem } from "../../types/types";

type Platform = ScheduleItem["platform"];

let failureCount = 0;          // consecutive failures counter
const MAX_FAILURES = 5;        // stop auto attempts after this
let pausedDueToFailures = false;
const warnedNoKey = new Set<string>(); // store item.id values


/** Where we store the user’s schedule */
const schedulePath = path.join(app.getPath("userData"), "schedule.json");

/** Profiles to use per platform (tweak these names to match your OBS) */
const PROFILE_FOR: Record<Platform, string> = {
  facebook: "SingleStream",
  youtube:  "SingleStream",   // YouTube-only (service configured inside OBS)
  multi:    "MultiStream",    // Multi-RTMP profile with plugin set to sync
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
    failureCount = 0; // ✅ success → reset
    return result;
  } catch (err: any) {
    failureCount++;
    logError(`❌ Scheduler error during ${context}: ${err.message || err}`);
    if (failureCount >= MAX_FAILURES) {
      pausedDueToFailures = true;
      logError(`⚠️ Scheduler paused after ${failureCount} consecutive failures.`);
      // optionally, notify the renderer/UI
      const win = getMainWindow();
      win?.webContents.send("scheduler-paused", {
        reason: "too many errors",
        count: failureCount,
      });
    }
    return null;
  }
}


function iso(s: string) { return new Date(s); }
function addMinutes(d: Date, m: number) { return new Date(d.getTime() + m * 60000); }

let tickTimer: NodeJS.Timeout | null = null;

/** simple in-memory state so we don’t double-start/stop */
const state = {
  activeId: null as string | null,
  isStreaming: false,
};

async function startForItem(item: ScheduleItem) {
  try {
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
      // YouTube-only: do NOT overwrite service settings; just start output
      await obs.call("StartStream");
    }

    state.activeId = item.id;
    state.isStreaming = true;
    logInfo(`▶️ Scheduler started stream: ${item.name} (${item.platform})`);
  } catch (e: any) {
    logError(`Scheduler start failed for "${item.name}": ${e.message}`);
  }
}

async function stopIfStreaming(reason: string) {
  try {
    await stopObsStream();
  } catch (e: any) {
    logWarn(`Scheduler stop warning: ${e.message}`);
  } finally {
    logInfo(`⏹ Scheduler stopped stream (${reason})`);
    state.activeId = null;
    state.isStreaming = false;
  }
}

/** core clock: checks schedule every 5 seconds */
async function tick(_win?: BrowserWindow) {
  // ⛔ pause if too many failures
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

    if (!auto) continue;
    if (now >= start && now < end) {
      current = item;
      break;
    }
  }

  // ✅ No current item
  if (!current) {
    if (state.isStreaming) {
      await safeCall(() => stopIfStreaming("no scheduled item active"), "stop unscheduled");
    }
    return;
  }

  // ✅ Current item found — check if it has a Facebook key
  if (!current.fbKey || !current.fbKey.trim()) {
    if (!warnedNoKey.has(current.id)) {
      logWarn(`Scheduler: "${current.name}" needs a Facebook key but none provided`);
      warnedNoKey.add(current.id);
    }
    // ensure we are not streaming wrong/empty key
    if (state.isStreaming && state.activeId === current.id) {
      await safeCall(() => stopIfStreaming("missing FB key"), "stop missing key");
    }
    return; // skip trying to start
  }

  // ✅ Now, handle start/stop normally
  if (!state.isStreaming || state.activeId !== current.id) {
    await safeCall(() => startForItem(current), `start ${current.name}`);
  } else {
    const end = addMinutes(iso(current.startTime), current.durationMinutes);
    if (now >= end) {
      await safeCall(() => stopIfStreaming("duration elapsed"), "stop after duration");
    }
  }
}



export function startStreamScheduler(win?: BrowserWindow) {
  if (tickTimer) return; // already running
  logInfo("🗓️ Scheduler: started");
  // initial slight delay to avoid racing just after app startup
  setTimeout(() => tick(win), 1500);
  tickTimer = setInterval(() => tick(win), 5000);
}

export function stopStreamScheduler() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
  logInfo("🗓️ Scheduler: stopped");
}
