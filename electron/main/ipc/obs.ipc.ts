// filepath: electron/main/ipc/obs.ipc.ts
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

  ipcMain.handle("obs:getProfiles", async () => {
    return await getProfileList();
  });

  ipcMain.handle("obs:setProfile", async (_event, profileName: string) => {
    return await setCurrentProfile(profileName);
  });

  ipcMain.on("start-stream", async (_e, key: string) => {
    await startStream(key);
  });

  ipcMain.on("stop-stream", async () => {
    // manual stop from UI/operator
    await stopStream("manual");
  });

  ipcMain.handle(
      "obs:startSmartStream",
      async (_event, { key, mode }: { key: string; mode: "single" | "multi" }) => {
        return await startSmartStream(key, mode);
      }
  );

  ipcMain.handle("obs:ensureProfile", async (_event, required: string) => {
    return await ensureProfile(required);
  });
}
