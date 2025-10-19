import { ipcMain } from "electron";
import { getProfileList, setCurrentProfile, startStream, stopStream } from "./obsController";

/**
 * Registers all IPC bridges between Renderer and Main process
 */
export function registerIpcHandlers() {
    // IPC events from renderer
    ipcMain.on("start-stream", async (_e, key) => await startStream(key))
    ipcMain.on("stop-stream", async () =>  await stopStream())


    // Profile management
    ipcMain.handle("obs:getProfiles", async () => {
        const data = await getProfileList();
        console.log("🔍 Sending profile list to renderer:", data);
        return data;
    });

    ipcMain.handle("obs:setProfile", async (_event, profileName: string) => {
        return await setCurrentProfile(profileName);
    });

    // (Later you can add more like stream control, logs, etc.)
}
