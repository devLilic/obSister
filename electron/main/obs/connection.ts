import OBSWebSocket from "obs-websocket-js";
import { BrowserWindow } from "electron";
import { logInfo, logWarn, logError } from "../config/logger";
import { loadConfig } from "../config/config";

export const obs = new OBSWebSocket();

let isConnected = false;
let mainWindow: BrowserWindow | null = null;
let reconnectInterval: NodeJS.Timeout | null = null;
let reconnecting = false;

export function setMainWindow(win: BrowserWindow) {
  mainWindow = win;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * Attempt to connect to OBS.
 */
async function tryConnect() {
  const cfg = loadConfig();

  // Prevent overlapping connection attempts
  if (reconnecting || isConnected) return;

  reconnecting = true;
  logInfo(`🔌 Attempting connection to OBS (${cfg.host})...`);

  try {
    await obs.connect(cfg.host, cfg.password);
    isConnected = true;
    reconnecting = false;

    logInfo(`✅ Connected to OBS WebSocket (${cfg.host})`);
    mainWindow?.webContents.send("obs-status", true);

    // Stop reconnect loop if active
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
      logInfo("🟢 Stopped reconnect loop (connection established)");
    }
  } catch (error: any) {
    reconnecting = false;
    const msg = error?.message || String(error);
    if (msg.includes("WebSocket was closed")) {
      logWarn("⚠️ OBS socket closed during connect (likely OBS was closed)");
    } else {
      logWarn(`OBS not reachable (${msg}). Retrying in ${cfg.retryDelay / 1000}s...`);
    }

    isConnected = false;
    mainWindow?.webContents.send("obs-status", false);
  }
}

/**
 * Start persistent OBS connection loop.
 */
export async function startOBSConnectionLoop() {
  const cfg = loadConfig();
  logInfo("🔄 Starting OBS connection loop...");
  await tryConnect();

  // Ensure loop only exists once
  if (!reconnectInterval) {
    reconnectInterval = setInterval(() => {
      if (!isConnected) tryConnect();
    }, cfg.retryDelay);
  }
}

/**
 * Return connection state.
 */
export function getOBSStatus() {
  return isConnected;
}

/**
 * Setup OBS event listeners
 */
obs.on("Identified", () => {
  logInfo("🟢 OBS WebSocket authenticated and ready");
  isConnected = true;
  mainWindow?.webContents.send("obs-status", true);
  mainWindow?.webContents.send("obs-reconnected"); // 👈 NEW event
});

obs.on("ConnectionOpened", () => {
  logInfo("🔗 OBS connection opened");
});

obs.on("ConnectionClosed", () => {
  logWarn("⚠️ OBS connection closed or lost");
  isConnected = false;
  mainWindow?.webContents.send("obs-status", false);

  // Clear existing reconnect interval before restarting
  if (reconnectInterval) clearInterval(reconnectInterval);

  // Wait a bit, then restart connection attempts
  setTimeout(() => {
    const cfg = loadConfig();
    logInfo("🔁 Reconnecting to OBS...");
    reconnectInterval = setInterval(() => {
      if (!isConnected) tryConnect();
    }, cfg.retryDelay);
  }, 2000); // wait 2s before retry
});

obs.on("ConnectionError", (err: any) => {
  logError(`❌ OBS connection error: ${err?.message || err}`);
});

process.on("uncaughtException", (err) => {
  logError(`💥 Uncaught exception: ${err.message}`);
});
