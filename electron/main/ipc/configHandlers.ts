import { ipcMain } from "electron";
import fs from "fs";
import { getConfigPath, loadConfig, OBSConfig } from "../config/config";
import { logInfo, logError } from "../config/logger";

export function registerConfigIpc() {
  // Get current config
  ipcMain.handle("config:get", () => {
    return loadConfig();
  });

  // Save updated config
  ipcMain.handle("config:save", (_event, newData: OBSConfig) => {
    try {
      const configPath = getConfigPath();
      fs.writeFileSync(configPath, JSON.stringify(newData, null, 2));
      logInfo("⚙️ Configuration saved");
      return { success: true };
    } catch (e: any) {
      logError("Failed to save config: " + e.message);
      return { success: false, error: e.message };
    }
  });
}
