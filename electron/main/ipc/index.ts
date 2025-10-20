// electron/main/ipc/index.ts
import { registerOBSHandlers } from "./obs.ipc";
import { logInfo } from "../config/logger";

export function registerIpcHandlers() {
  logInfo("🧠 Initializing all IPC handlers...");
  registerOBSHandlers();
  // registerSchedulerHandlers();
  // registerSettingsHandlers();
}
