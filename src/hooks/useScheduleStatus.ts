// File: src/hooks/useScheduleStatus.ts
import { useEffect, useState, useCallback } from "react";
import { useSchedule } from "../context/ScheduleContext";
import { ScheduleItem } from "../../electron/types/types";

interface ScheduleStatus {
  next: ScheduleItem | null;
  timeToNext: string;
  timeToEnd: string; // helper vizual (nu decide LIVE)
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

  const [next, setNext] = useState<ScheduleItem | null>(null);
  const [timeToNext, setTimeToNext] = useState("—");
  const [timeToEnd, setTimeToEnd] = useState("—");

  // FIND NEXT (exclude terminated)
  const findNext = useCallback((): ScheduleItem | null => {
    const now = Date.now();

    return (
        items
            .filter((item) => item.status !== "terminated")
            .filter((item) => new Date(item.startTime).getTime() > now)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null
    );
  }, [items]);

  const updateStatus = useCallback(() => {
    const now = new Date();

    const nxt = findNext();
    setNext(nxt);

    // time to next
    if (nxt) {
      const diff = new Date(nxt.startTime).getTime() - now.getTime();
      setTimeToNext(formatDuration(diff));
    } else {
      setTimeToNext("—");
    }

    // timeToEnd rămâne helper vizual general (nu decide LIVE)
    // (în UI îl afișăm doar când Electron spune LIVE)
    setTimeToEnd((prev) => prev ?? "—");
  }, [findNext]);

  const refreshStatus = useCallback(() => updateStatus(), [updateStatus]);

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [updateStatus]);

  return { next, timeToNext, timeToEnd, refreshStatus };
}
