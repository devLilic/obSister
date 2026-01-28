// filepath: electron/main/obs/events.ts
import { obs, startOBSConnectionLoop } from "./connection";
import { logInfo, logWarn } from "../config/logger";
import { BrowserWindow } from "electron";
import {
  getStreamState,
  getActiveScheduleItemId,
  markEnded,
  setActiveScheduleItemId,
  isExpectedDisconnectNow, setStreamState
} from "../stream/streamTruth";
import { setScheduleItemStatus } from "../schedule/store";

let mainWindow: BrowserWindow | null = null;

// Phase 5: end->idle should be quick after OBS confirms STOPPED
const ENDED_TO_IDLE_DELAY_MS = 5000;

let endedToIdleTimer: NodeJS.Timeout | null = null;
let lastObsOutputState: string | null = null;

function cancelEndedToIdleTimer(reason: string) {
  if (!endedToIdleTimer) return;
  clearTimeout(endedToIdleTimer);
  endedToIdleTimer = null;
  logInfo(`🧯 ended→idle timer canceled (${reason})`);
}

function scheduleEndedToIdleTimer() {
  // reset existing
  cancelEndedToIdleTimer("reschedule");

  endedToIdleTimer = setTimeout(() => {
    endedToIdleTimer = null;

    // Spec: after OUTPUT_STOPPED, wait up to 5s then:
    // if still ended AND no active stream => set idle
    const st = getStreamState();
    if (st !== "ended") return;

    // "no stream active" = OBS output still stopped (and no new start happened)
    if (lastObsOutputState !== "OBS_WEBSOCKET_OUTPUT_STOPPED") return;

    setStreamState("idle");
  }, ENDED_TO_IDLE_DELAY_MS);
}

export function setEventWindow(win: BrowserWindow) {
  mainWindow = win;
}


export function setupOBSListeners() {
  obs.on("ConnectionOpened", () => {
    logInfo("🔌 OBS connection established");
    mainWindow?.webContents.send("obs-status", true);
  });

  obs.on("ConnectionClosed", () => {
    // Phase 5: expected disconnect window after End Stream => NOT obs_crash
    const expected = isExpectedDisconnectNow();

    if (expected) {
      logInfo("ℹ️ OBS connection closed (expected after End Stream)");
    } else {
      logWarn("⚠️ OBS connection lost");
    }

    mainWindow?.webContents.send("obs-status", false);

    const st = getStreamState();

    if (!expected) {
      // PHASE 1: If stream was live/ending, treat as definitive ended (obs_crash).
      if (st === "live" || st === "ending") {
        markEnded("obs_crash");

        const activeId = getActiveScheduleItemId();
        if (activeId) {
          // Remove from re-launch attempts by marking as terminated
          setScheduleItemStatus(activeId, "terminated");
          setActiveScheduleItemId(null);
        }
      }
    } else {
      // Expected shutdown: do not mark crash, do not terminate schedule item
      // (scheduler/streamTruth will progress normally)
    }

    startOBSConnectionLoop();
  });


  obs.on("Identified", () => logInfo("OBS WebSocket authenticated"));

  obs.on("StreamStateChanged", (data: any) => {
    const state = String(data?.outputState ?? "");
    lastObsOutputState = state;

    logInfo(`Stream state: ${state}`);

    // B) Cancel safely if stream starts (or is starting)
    if (state === "OBS_WEBSOCKET_OUTPUT_STARTING" || state === "OBS_WEBSOCKET_OUTPUT_STARTED") {
      cancelEndedToIdleTimer(state);
      return;
    }

    // A) Trigger end->idle timer after STOPPED
    if (state === "OBS_WEBSOCKET_OUTPUT_STOPPED") {
      scheduleEndedToIdleTimer();
      return;
    }

    // If we get STOPPING, keep timer decision based on STOPPED only (no action)
  });

  obs.on("CurrentProfileChanged", (data: any) => {
    logInfo(`🟢 OBS profile changed: ${data.profileName}`);
    mainWindow?.webContents.send("obs-profile-changed", data.profileName);
  });
}
