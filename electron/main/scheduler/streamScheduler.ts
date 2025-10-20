// electron/main/scheduler/streamScheduler.ts
import fs from "fs";
import path from "path";
import { app, BrowserWindow } from "electron";
import { obs } from "../obs/connection";
import { ensureProfile } from "../obs/profile";
import { startStream as startFacebookStream, stopStream as stopObsStream } from "../obs/controller";
import { logInfo, logWarn, logError } from "../config/logger";

type Platform = "facebook" | "youtube" | "multi";

export interface ScheduleItem {
  id: string;
  name: string;
  platform: Platform;
  startTime: string;          // ISO string
  durationMinutes: number;
  fbKey?: string;             // needed for facebook / multi
  autoStart?: boolean;        // optional (default true)
}

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
  const list = loadSchedule();
  const now = new Date();

  // identify current & next
  let current: ScheduleItem | undefined;
  for (const item of list) {
    const start = iso(item.startTime);
    const end = addMinutes(start, item.durationMinutes);
    const auto = item.autoStart !== false; // default true

    if (!auto) continue;
    if (now >= start && now < end) {
      current = item;
      break;
    }
  }

  if (current) {
    // Should be streaming this item
    if (!state.isStreaming || state.activeId !== current.id) {
      await startForItem(current);
    } else {
      // already streaming the right item: check for end
      const end = addMinutes(iso(current.startTime), current.durationMinutes);
      if (now >= end) {
        await stopIfStreaming("duration elapsed");
      }
    }
  } else {
    // No current item; stop if something is still streaming
    if (state.isStreaming) {
      await stopIfStreaming("no scheduled item active");
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
