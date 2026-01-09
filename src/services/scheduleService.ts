// File: src/services/scheduleService.ts
import type { ScheduleItem, ScheduleItemStatus } from "../../electron/types/types";

export async function getSchedule(): Promise<ScheduleItem[]> {
    return await window.api.schedule.get();
}

export async function saveSchedule(items: ScheduleItem[]): Promise<boolean> {
    return await window.api.schedule.save(items);
}

export async function setScheduleItemStatus(id: string, status: ScheduleItemStatus): Promise<boolean> {
    return await window.api.schedule.setStatus(id, status);
}
