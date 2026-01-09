// filepath: electron/main/schedule/store.ts
import fs from "fs";
import path from "path";
import { app } from "electron";
import { logInfo, logError } from "../config/logger";
import { ScheduleItem, ScheduleItemStatus, ScheduleSkipReason } from "../../types/types";
import { calculateScheduleItemStatus } from "./status";
import { applyStopFrameFiltersToSchedule } from "../stopFrame/filtersStore";

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
    status: raw.status,
    skipReason: raw.skipReason as ScheduleSkipReason | undefined,
    stopFramePath: raw.stopFramePath,
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

/**
 * PHASE 4A:
 * Apply StopFrame filters BEFORE saving schedule.json.
 * This ensures scheduler can use schedule.json directly (no runtime refilter).
 */
export function saveSchedule(list: ScheduleItem[]) {
  try {
    // Apply filters before normalization/persist
    const applied = applyStopFrameFiltersToSchedule(list).items;

    const normalized = applied.map(normalizeItem);
    fs.writeFileSync(schedulePath, JSON.stringify(normalized, null, 2));
    logInfo("🗓️ Schedule saved locally.");
  } catch (e: any) {
    logError("Failed to save schedule: " + e.message);
  }
}

/**
 * Minimal helper to mark an item status (e.g., terminated / skipped).
 */
export function setScheduleItemStatus(id: string, status: ScheduleItemStatus) {
  try {
    const list = loadSchedule();
    const updated = list.map((item) => (item.id === id ? { ...item, status } : item));
    saveSchedule(updated);
  } catch (e: any) {
    logError(`Failed to set schedule item status: ${e?.message ?? String(e)}`);
  }
}

export function markScheduleItemSkipped(id: string, reason: ScheduleSkipReason) {
  try {
    const list = loadSchedule();
    const updated = list.map((item) =>
        item.id === id ? { ...item, status: "skipped" as const, skipReason: reason } : item
    );
    saveSchedule(updated);
  } catch (e: any) {
    logError(`Failed to mark item skipped: ${e?.message ?? String(e)}`);
  }
}
