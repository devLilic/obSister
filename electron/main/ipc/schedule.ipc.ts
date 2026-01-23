// electron/main/ipc/scheduleHandlers.ts
import { ipcMain } from "electron";
import { loadSchedule, saveSchedule } from "../schedule/store";
import { ScheduleItemStatus } from "../../types/types";

export function registerScheduleIpc() {
  ipcMain.handle("schedule:get", () => loadSchedule());

  ipcMain.handle("schedule:save", (_event, data) => {
    saveSchedule(data);
    return true;
  });

  // 👇 NOU: setarea status-ului unui item din React
  ipcMain.handle(
    "schedule:setStatus",
    (_event, { id, status }: { id: string; status: ScheduleItemStatus }) => {
      const list = loadSchedule();

      const updated = list.map((item) =>
        item.id === id ? { ...item, status } : item
      );

      saveSchedule(updated);
      return true;
    }
  );
}
