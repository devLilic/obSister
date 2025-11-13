// electron/main/schedule/store.ts
import fs from "fs";
import path from "path";
import { app } from "electron";
import { logInfo, logError } from "../config/logger";
import { ScheduleItem } from "../../types/types";
import { calculateScheduleItemStatus } from "./status";

const schedulePath = path.join(app.getPath("userData"), "schedule.json");

// helper ca să asigurăm câmpul status chiar și pentru fișiere vechi
function normalizeItem(raw: any): ScheduleItem {
  const base: ScheduleItem = {
    id: raw.id,
    name: raw.name,
    platform: raw.platform,
    startTime: raw.startTime,
    durationMinutes: raw.durationMinutes,
    fbKey: raw.fbKey,
    autoStart: raw.autoStart,
    // dacă nu are status (fișier vechi) îl calculăm
    status: raw.status,
  };

  return {
    ...base,
    status: calculateScheduleItemStatus(base),
  };
}

export function loadSchedule(): ScheduleItem[] {
  try {
    const text = fs.readFileSync(schedulePath, "utf-8");
    const data = JSON.parse(text);
    const list: any[] = Array.isArray(data) ? data : [];
    return list.map(normalizeItem);
  } catch {
    logError("⚠️ No existing schedule.json, creating a new one.");
    fs.writeFileSync(schedulePath, "[]");
    return [];
  }
}

export function saveSchedule(list: ScheduleItem[]) {
  try {
    const normalized = list.map(normalizeItem);
    fs.writeFileSync(schedulePath, JSON.stringify(normalized, null, 2));
    logInfo("🗓️ Schedule saved locally.");
  } catch (e: any) {
    logError("Failed to save schedule: " + e.message);
  }
}
