// filepath: electron/main/ipc/index.ts
import { registerOBSHandlers } from "./obs.ipc";
import { logInfo } from "../config/logger";
import { registerAutoStopIpc } from "./autoStop.ipc.ts";
import { registerStreamContextIpc } from "./streamContext.ipc";
import { registerStopFramesIpc } from "./stopFrames.ipc";
import { registerStopFramesPreviewIpc } from "./stopFramesPreview.ipc";

export function registerIpcHandlers() {
  logInfo("🧠 Initializing all IPC handlers...");
  registerOBSHandlers();
  registerAutoStopIpc();
  registerStreamContextIpc();

  // PHASE 4A: StopFrame filter groups CRUD
  registerStopFramesIpc();

  // PHASE 4D: StopFrame preview (safe, no file://)
  registerStopFramesPreviewIpc();
}
