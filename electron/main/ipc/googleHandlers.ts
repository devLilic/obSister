import { ipcMain } from "electron";
import { testGoogleSheetsConnection } from "../google/testConnection";
import { syncScheduleFromGoogle } from "../google/syncScheduleFromGoogle";

export function registerGoogleIpc() {
  ipcMain.handle("google:testConnection", async (_event, params) => {
    const { sheetId, keyPath, tabName } = params;
    const result = await testGoogleSheetsConnection(sheetId, keyPath, tabName);
    return result;
  });
  ipcMain.handle("google:syncSchedule", async () => {
    const result = await syncScheduleFromGoogle();
    return result;
  });
}
