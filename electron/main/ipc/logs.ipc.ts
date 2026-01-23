// File: electron\main\ipc\logsHandlers.ts
import { ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { app } from "electron";

const logPath = path.join(app.getPath("userData"), "logs", "obSister.log");

export function registerLogsIpc() {
  ipcMain.handle("logs:load", () => {
    try {
      if (!fs.existsSync(logPath)) return [];
      const content = fs.readFileSync(logPath, "utf8");
      const lines = content.trim().split(/\r?\n/);
      // Parse log format like [INFO] 2025-10-20T12:34:00 message
      const parsed = lines.slice(-200).map((line) => {
        const match = line.match(/^\[([A-Z]+)\]\s+(.+?)\s+(.*)$/);
        if (!match) return { timestamp: new Date().toISOString(), level: "info", message: line };
        const [, level, timestamp, message] = match;
        return {
          timestamp,
          level: level.toLowerCase(),
          message,
        };
      });
      return parsed;
    } catch (e: any) {
      return [
        {
          timestamp: new Date().toISOString(),
          level: "error",
          message: `Error reading log file: ${e.message}`,
        },
      ];
    }
  });

  ipcMain.handle("logs:clear", () => {
    try {
      if (fs.existsSync(logPath)) fs.writeFileSync(logPath, "");
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
}
