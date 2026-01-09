// filepath: electron/main/ipc/streamContext.ipc.ts
import { ipcMain } from "electron";
import { getStreamContext } from "../stream/streamTruth";

/**
 * READ-ONLY snapshot for runtime truth.
 * No side effects.
 */
export function registerStreamContextIpc() {
    ipcMain.handle("stream:getContext", () => {
        return getStreamContext();
    });
}
