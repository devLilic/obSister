// filepath: electron/main/ipc/index.ts
import { registerOBSHandlers } from "./obs.ipc";
import { logInfo } from "../config/logger";
import { registerAutoStopIpc } from "./autoStop.ipc";
import { registerStreamContextIpc } from "./streamContext.ipc";
import { registerStopFramesIpc } from "./stopFrames.ipc";
import { registerStopFramesPreviewIpc } from "./stopFramesPreview.ipc";
import {registerScheduleIpc} from "./schedule.ipc.ts";
import {registerConfigIpc} from "./config.ipc.ts";
import {registerLogsIpc} from "./logs.ipc.ts";
import {registerGoogleIpc} from "./google.ipc.ts";

export function registerIpcHandlers() {
  logInfo("🧠 Initializing all IPC handlers...");

  registerScheduleIpc();
  registerConfigIpc();
  registerLogsIpc();
  registerGoogleIpc();

  registerOBSHandlers();
  registerAutoStopIpc();
  registerStreamContextIpc();

  // PHASE 4A: StopFrame filter groups CRUD
  registerStopFramesIpc();

  // PHASE 4D: StopFrame preview (safe, no file://)
  registerStopFramesPreviewIpc();
}
