import { useEffect, useState, useCallback } from "react";
import { useSchedule } from "../context/ScheduleContext";
import { ScheduleItem } from "../../electron/types/types";

interface ScheduleStatus {
  current: ScheduleItem | null;
  next: ScheduleItem | null;
  timeToNext: string;
  timeToEnd: string;
  refreshStatus: () => void;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60 - hours * 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function useScheduleStatus(): ScheduleStatus {
  const { items } = useSchedule();

  const [current, setCurrent] = useState<ScheduleItem | null>(null);
  const [next, setNext] = useState<ScheduleItem | null>(null);
  const [timeToNext, setTimeToNext] = useState("—");
  const [timeToEnd, setTimeToEnd] = useState("—");

  // ------------------------------
  // FIND CURRENT
  // ------------------------------
  const findCurrent = useCallback((): ScheduleItem | null => {
  const now = Date.now();

  return (
    items.find(item => {
      if (item.status === "terminated") return false;   // 👈 exclude TERMINATED
      const start = new Date(item.startTime).getTime();
      const end = start + item.durationMinutes * 60000;
      return now >= start && now < end;
    }) || null
  );
}, [items]);

  // ------------------------------
  // FIND NEXT
  // ------------------------------
  const findNext = useCallback((): ScheduleItem | null => {
  const now = Date.now();

  return (
    items
      .filter(item => item.status !== "terminated")      // 👈 exclude TERMINATED
      .filter(item => new Date(item.startTime).getTime() > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null
  );
}, [items]);

  // ------------------------------
  // UPDATE STATUS (current & next)
  // ------------------------------
  const updateStatus = useCallback(() => {
    const now = new Date();

    const cur = findCurrent();
    const nxt = findNext();

    setCurrent(cur);
    setNext(nxt);

    // time to end (only for current)
    if (cur) {
      const end = new Date(new Date(cur.startTime).getTime() + cur.durationMinutes * 60000);
      setTimeToEnd(formatDuration(end.getTime() - now.getTime()));
    } else {
      setTimeToEnd("—");
    }

    // time to next
    if (nxt) {
      const diff = new Date(nxt.startTime).getTime() - now.getTime();
      setTimeToNext(formatDuration(diff));
    } else {
      setTimeToNext("—");
    }
  }, [findCurrent, findNext]);

  const refreshStatus = useCallback(() => updateStatus(), [updateStatus]);

  // Auto-refresh every second
  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [updateStatus]);

  return { current, next, timeToNext, timeToEnd, refreshStatus };
}
