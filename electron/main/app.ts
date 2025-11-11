// electron/main/app.ts
import { app, BrowserWindow } from "electron";
import fs from "fs";
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

dotenv.config();

function resolvePreload() {
  const mjs = path.join(__dirname, "preload.mjs");
  const js = path.join(__dirname, "preload.js");
  return fs.existsSync(mjs) ? mjs : js;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

function createMainWindow() {

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 900,
    title: "obSister",
    icon: path.join(process.env.VITE_PUBLIC || "", "electron-vite.svg"),
    webPreferences: {
      preload: resolvePreload(),
    },
  });

  setMainWindow(mainWindow);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(process.resourcesPath, 'index.html');
    console.log('Loading from:', indexPath);
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load index.html', err);
    });
    // const appPath = app.isPackaged
    //   ? path.join(process.resourcesPath, 'dist', 'index.html')
    //   : path.join(__dirname, '../dist/index.html');
    // mainWindow.loadFile(appPath);
    // // const indexPath = path.join(__dirname, '../dist/index.html');
    // // console.log('Loading file:', indexPath);
    // // mainWindow.loadFile(indexPath);
    // mainWindow.loadFile(path.join(process.resourcesPath, "app.asar", "index.html"));
  }

  // Optional: open devtools during development
  mainWindow.webContents.openDevTools({mode: "detach"});

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

  const win = createMainWindow();
  registerScheduleIpc();
  attachLogWindow(win); // ✅ This enables live logs
  registerConfigIpc();
  registerLogsIpc();
  registerGoogleIpc();

  registerIpcHandlers();
  setupOBSListeners();

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
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

// On quit, stop scheduler (and optionally disconnect OBS)
app.on("before-quit", () => {
  stopStreamScheduler();
});