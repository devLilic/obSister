// electron/main/app.ts
import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { attachLogWindow, logInfo } from "./config/logger";
import { registerIpcHandlers } from "./ipc";
import {
  setMainWindow,
  setupOBSListeners,
  startOBSConnectionLoop,
  getOBSStatus,
} from "./obs";
import { registerScheduleIpc } from "./ipc/scheduleHandlers";
import { startStreamScheduler, stopStreamScheduler } from "./scheduler/streamScheduler";
import { registerConfigIpc } from "./ipc/configHandlers";
import { registerLogsIpc } from "./ipc/logsHandlers";
import { registerGoogleIpc } from "./ipc/googleHandlers";
import { initAutoStopOrchestrator } from "./features/autoStop/autoStopOrchestrator";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST


let mainWindow: BrowserWindow | null = null;

function createWindow() {

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 900,
    title: "obSister",
    icon: path.join(process.env.VITE_PUBLIC || "", "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  setMainWindow(mainWindow);

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Optional: open devtools during development
  // mainWindow.webContents.openDevTools({mode: "detach"});

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('Failed to load renderer:', e, code, desc);
  });

  return mainWindow;
}


// -------------------------
// App Lifecycle
// -------------------------

app.whenReady().then(async () => {
  logInfo("🟢 obSister launched");

  const win = createWindow();
  registerScheduleIpc();
  attachLogWindow(win); // ✅ This enables live logs
  registerConfigIpc();
  registerLogsIpc();
  registerGoogleIpc();

  registerIpcHandlers();
  setupOBSListeners();
  initAutoStopOrchestrator();


  win.webContents.on("did-finish-load", async () => {
    await startOBSConnectionLoop();
    win.webContents.send("obs-status", getOBSStatus());
    startStreamScheduler(win);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// On quit, stop scheduler (and optionally disconnect OBS)
app.on("before-quit", () => {
  stopStreamScheduler();
});
