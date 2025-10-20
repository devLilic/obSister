import { ipcMain } from "electron";
import { loadSchedule, saveSchedule } from "../schedule/store";

export function registerScheduleIpc() {
  ipcMain.handle("schedule:get", () => loadSchedule());
  ipcMain.handle("schedule:save", (_event, data) => {
    saveSchedule(data);
    return true;
  });
}
