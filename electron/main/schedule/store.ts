import fs from "fs";
import path from "path";
import { app } from "electron";
import { ScheduleItem } from "./types";
import { logInfo, logError } from "../config/logger";

const schedulePath = path.join(app.getPath("userData"), "schedule.json");

export function loadSchedule(): ScheduleItem[] {
  try {
    const text = fs.readFileSync(schedulePath, "utf-8");
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    logError("⚠️ No existing schedule.json, creating a new one.");
    fs.writeFileSync(schedulePath, "[]");
    return [];
  }
}

export function saveSchedule(list: ScheduleItem[]) {
  try {
    fs.writeFileSync(schedulePath, JSON.stringify(list, null, 2));
    logInfo("🗓️ Schedule saved locally.");
  } catch (e: any) {
    logError("Failed to save schedule: " + e.message);
  }
}
