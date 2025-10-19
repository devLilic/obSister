import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { startOBSConnectionLoop, setupOBSListeners, getOBSStatus, testGetInputs, getProfileList } from "./obsController";
import { logInfo } from "./logger";
import { setMainWindow } from './obsController';
import { registerIpcHandlers } from './ipcHandlers';

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function sendOBSStatus(status: boolean) {
  if (win) win.webContents.send("obs-status", status);
}

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 800,
    title: "obSister",
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });
  setMainWindow(win); // Pass the window reference to obsController

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Uncomment below to open the DevTools:
  // win.webContents.openDevTools()

  win.on("closed", () => {
    win = null;
  });
}

  

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  logInfo("🟢 obSister started");
  createWindow();
  registerIpcHandlers();
  setupOBSListeners();

  if(win){
    win.webContents.on("did-finish-load", async () => {
      await startOBSConnectionLoop(); // connect once window is ready
      sendOBSStatus(getOBSStatus());

       // give it a few seconds to connect before testing
      setTimeout(() => getProfileList(), 3000);
  });
  }
})


