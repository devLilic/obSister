// filepath: electron/main/config/logger.ts
import log from "electron-log";
import path from "path";
import fs from "fs";
import { app, BrowserWindow } from "electron";
import type { AppActionType } from "../../types/types";

// Ensure log directory exists
const logDir = path.join(app.getPath("userData"), "logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// Configure electron-log outputs
log.transports.file.resolvePathFn = () => path.join(logDir, "obSister.log");
log.transports.file.level = "info";
log.transports.console.level = "info";

// Reference to main window for live updates
let mainWindow: BrowserWindow | null = null;

/**
 * Attach a BrowserWindow reference to send live log messages
 */
export function attachLogWindow(win: BrowserWindow) {
  mainWindow = win;
}

/**
 * Internal helper to broadcast log messages to renderer if window is ready
 */
function broadcastLog(level: string, message: string) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send("log-message", {
      level,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

export function logInfo(message: string) {
  log.info(message);
  broadcastLog("info", message);
}

export function logWarn(message: string) {
  log.warn(message);
  broadcastLog("warn", message);
}

export function logError(message: string) {
  log.error(message);
  broadcastLog("error", message);
}

/**
 * ACTION logger (required): logs action type + optional payload.
 */
export function logAction(type: AppActionType, payload?: Record<string, any>) {
  const msg =
      payload && Object.keys(payload).length > 0
          ? `🧾 ACTION:${type} ${JSON.stringify(payload)}`
          : `🧾 ACTION:${type}`;
  logInfo(msg);
}

export default log;
