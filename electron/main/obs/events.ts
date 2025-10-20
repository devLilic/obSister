import { obs, startOBSConnectionLoop } from "./connection";
import { logInfo, logWarn } from "../config/logger";
import { BrowserWindow } from "electron";

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
    startOBSConnectionLoop();
  });

  obs.on("Identified", () => logInfo("OBS WebSocket authenticated"));

  obs.on("StreamStateChanged", data => {
    logInfo(`Stream state: ${data.outputState}`);
  });

  obs.on("CurrentProfileChanged", data => {
    logInfo(`🟢 OBS profile changed: ${data.profileName}`);
    mainWindow?.webContents.send("obs-profile-changed", data.profileName);
  });
}
