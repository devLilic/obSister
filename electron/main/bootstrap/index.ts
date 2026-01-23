// electron/main/bootstrap/index.ts
import { app, BrowserWindow } from "electron";
import path from "node:path";

import { attachLogWindow, logInfo } from "../config/logger";

import { registerIpcHandlers } from "../ipc";

import {
    setMainWindow,
    setupOBSListeners,
    startOBSConnectionLoop,
    getOBSStatus,
} from "../obs";

import {
    startStreamScheduler,
    stopStreamScheduler,
} from "../scheduler/streamScheduler";

import { initAutoStopOrchestrator } from "../features/autoStop/autoStopOrchestrator";
type BootstrapParams = {
    __dirname: string;
    VITE_DEV_SERVER_URL?: string;
    RENDERER_DIST: string;
    VITE_PUBLIC: string;
};

let mainWindow: BrowserWindow | null = null;

function createWindow(params: BootstrapParams) {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 900,
        title: "obSister",
        icon: path.join(params.VITE_PUBLIC || "", "electron-vite.svg"),
        webPreferences: {
            preload: path.join(params.__dirname, "preload.mjs"),
        },
    });

    setMainWindow(mainWindow);

    if (params.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(params.VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(params.RENDERER_DIST, "index.html"));
    }

    // Optional: open devtools during development
    // mainWindow.webContents.openDevTools({mode: "detach"});

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

    mainWindow.webContents.on("did-fail-load", (e, code, desc) => {
        console.error("Failed to load renderer:", e, code, desc);
    });

    return mainWindow;
}

/**
 * Entry point for Electron main lifecycle.
 * IMPORTANT: Behavior kept identical to previous app.ts (same init order + did-finish-load hook).
 */
export function startMain(params: BootstrapParams) {
    // -------------------------
    // App Lifecycle
    // -------------------------

    app.whenReady().then(async () => {
        logInfo("🟢 obSister launched");

        const win = createWindow(params);

        // Keep registration order same as before
        attachLogWindow(win); // ✅ live logs
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
        // Keep behavior identical: only recreate window (no extra re-init here)
        if (BrowserWindow.getAllWindows().length === 0) createWindow(params);
    });

    // On quit, stop scheduler (and optionally disconnect OBS)
    app.on("before-quit", () => {
        stopStreamScheduler();
    });
}
