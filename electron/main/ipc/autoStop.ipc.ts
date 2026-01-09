// filepath: electron/main/ipc/autoStop.ipc.ts
import { ipcMain, dialog } from "electron";
import { getAutoStopService } from "../features/autoStop/autoStopService";
import { logInfo } from "../config/logger";
import { getStreamContext } from "../stream/streamTruth";

export function registerAutoStopIpc() {
    logInfo("🧩 Registering AutoStop IPC handlers");

    const autoStopService = getAutoStopService();

    ipcMain.handle("autoStop:setConfig", async (_e, config) => {
        if (config?.referenceImagePath) {
            await autoStopService.setReferenceImage(config.referenceImagePath);
        }
        autoStopService.setConfig(config);
    });

    // NOTE: these remain available for manual testing, but runtime enforcement
    // will start/stop scan itself. Keeping for backward compatibility.
    ipcMain.handle("autoStop:start", () => {
        autoStopService.start();
    });

    ipcMain.handle("autoStop:stop", () => {
        autoStopService.stop();
    });

    ipcMain.handle("autoStop:getStatus", () => {
        return autoStopService.getStatus();
    });

    ipcMain.handle("autoStop:selectReferenceImage", async () => {
        const result = await dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
        });

        return result.canceled ? null : result.filePaths[0];
    });

    /**
     * READ-ONLY stream context for AutoStop consumers.
     */
    ipcMain.handle("autoStop:getStreamContext", () => {
        return getStreamContext();
    });
}
