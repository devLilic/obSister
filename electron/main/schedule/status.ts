// electron/main/schedule/status.ts
import { ScheduleItem, ScheduleItemStatus } from "../../types/types";

export function calculateScheduleItemStatus(
  item: ScheduleItem
): ScheduleItemStatus {
  const now = Date.now();
  const start = new Date(item.startTime).getTime();
  const end = start + item.durationMinutes * 60_000;

  // dacă este marcat manual ca terminated → păstrăm asta
  if (item.status === "terminated") {
    return "terminated";
  }

  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "expired";
}
