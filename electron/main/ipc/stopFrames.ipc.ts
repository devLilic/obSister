// filepath: electron/main/ipc/stopFrames.ipc.ts
import { ipcMain } from "electron";
import {
    StopFrameFilterCreatePayload,
    StopFrameFilterPatch,
} from "../../types/types";
import {
    listFilters,
    createFilter,
    updateFilter,
    deleteFilter,
} from "../stopFrame/filtersStore";
import { logInfo } from "../config/logger";

export function registerStopFramesIpc() {
    logInfo("🧩 Registering StopFrames IPC handlers...");

    ipcMain.handle("stopFrames:listFilters", async () => {
        return listFilters();
    });

    ipcMain.handle("stopFrames:createFilter", async (_e, payload: StopFrameFilterCreatePayload) => {
        return createFilter(payload);
    });

    ipcMain.handle("stopFrames:updateFilter", async (_e, id: string, patch: StopFrameFilterPatch) => {
        return updateFilter(id, patch);
    });

    ipcMain.handle("stopFrames:deleteFilter", async (_e, id: string) => {
        return deleteFilter(id);
    });
}
