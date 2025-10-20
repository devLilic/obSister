// electron/main/ipc/obs.ipc.ts
import { ipcMain } from "electron";
import {
  getProfileList,
  setCurrentProfile,
  startStream,
  stopStream,
  startSmartStream,
  ensureProfile,
} from "../obs";
import { logInfo } from "../config/logger";

/**
 * Registers all OBS-related IPC channels.
 */
export function registerOBSHandlers() {
  logInfo("🧩 Registering OBS IPC handlers...");

  // --- Profile Management ---
  ipcMain.handle("obs:getProfiles", async () => {
    return await getProfileList();
  });

  ipcMain.handle("obs:setProfile", async (_event, profileName: string) => {
    return await setCurrentProfile(profileName);
  });

  // --- Stream Controls ---
  ipcMain.on("start-stream", async (_e, key: string) => {
    await startStream(key);
  });

  ipcMain.on("stop-stream", async () => {
    await stopStream();
  });

  // --- Smart Stream (auto profile switch) ---
  ipcMain.handle("obs:startSmartStream", async (_event, { key, mode }: { key: string; mode: "single" | "multi" }) => {
    return await startSmartStream(key, mode);
  });

  // --- Utility / Debug ---
  ipcMain.handle("obs:ensureProfile", async (_event, required: string) => {
    return await ensureProfile(required);
  });
}
