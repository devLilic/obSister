// filepath: electron/main/obs/events.ts
import { obs, startOBSConnectionLoop } from "./connection";
import { logInfo, logWarn } from "../config/logger";
import { BrowserWindow } from "electron";
import { getStreamState, getActiveScheduleItemId, markEnded, setActiveScheduleItemId } from "../stream/streamTruth";
import { setScheduleItemStatus } from "../schedule/store";

let mainWindow: BrowserWindow | null = null;

export function setEventWindow(win: BrowserWindow) {
  mainWindow = win;
}

export function setupOBSListeners() {
  obs.on("ConnectionOpened", () => {
    logInfo("🔌 OBS connection established");
    mainWindow?.webContents.send("obs-status", true);
  });

  obs.on("ConnectionClosed", () => {
    logWarn("⚠️ OBS connection lost");
    mainWindow?.webContents.send("obs-status", false);

    // PHASE 1: If stream was live/ending, treat as definitive ended (obs_crash).
    const st = getStreamState();
    if (st === "live" || st === "ending") {
      markEnded("obs_crash");

      const activeId = getActiveScheduleItemId();
      if (activeId) {
        // Remove from re-launch attempts by marking as terminated
        setScheduleItemStatus(activeId, "terminated");
        setActiveScheduleItemId(null);
      }
    }

    startOBSConnectionLoop();
  });

  obs.on("Identified", () => logInfo("OBS WebSocket authenticated"));

  obs.on("StreamStateChanged", (data: any) => {
    // Keep existing behavior (logging only) - no state derivation from time.
    logInfo(`Stream state: ${data.outputState}`);
  });

  obs.on("CurrentProfileChanged", (data: any) => {
    logInfo(`🟢 OBS profile changed: ${data.profileName}`);
    mainWindow?.webContents.send("obs-profile-changed", data.profileName);
  });
}
