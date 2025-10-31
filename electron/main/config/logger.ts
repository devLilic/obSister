// electron/main/config/logger.ts
import log from "electron-log";
import path from "path";
import fs from "fs";
import { app, BrowserWindow } from "electron";

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
    mainWindow.webContents.send("log-message", { level, message, timestamp: new Date().toISOString() });
  }
}

/**
 * INFO logger
 */
export function logInfo(message: string) {
  log.info(message);
  broadcastLog("info", message);
}

/**
 * WARNING logger
 */
export function logWarn(message: string) {
  log.warn(message);
  broadcastLog("warn", message);
}

/**
 * ERROR logger
 */
export function logError(message: string) {
  log.error(message);
  broadcastLog("error", message);
}

export default log;
