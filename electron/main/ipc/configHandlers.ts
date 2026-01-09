// electron/main/ipc/configHandlers.ts
import { ipcMain } from "electron";
import { loadConfig, saveConfig } from "../config/config";
import { logInfo, logError } from "../config/logger";
import { OBSConfig } from "../../types/types";

export function registerConfigIpc() {
  // Get current config
  ipcMain.handle("config:get", () => loadConfig());

  // Save updated config
  ipcMain.handle("config:save", (_event, newData: OBSConfig) => {
    try {
      saveConfig(newData);
      logInfo("⚙️ Configuration saved");
      return { success: true };
    } catch (e: any) {
      logError("Failed to save config: " + e.message);
      return { success: false, error: e.message };
    }
  });
}
