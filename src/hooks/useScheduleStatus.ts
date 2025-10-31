import { useEffect, useState, useCallback } from "react";
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

export function useScheduleStatus(schedule: ScheduleItem[]): ScheduleStatus {
  const [current, setCurrent] = useState<ScheduleItem | null>(null);
  const [next, setNext] = useState<ScheduleItem | null>(null);
  const [timeToNext, setTimeToNext] = useState("—");
  const [timeToEnd, setTimeToEnd] = useState("—");

  const findCurrent = useCallback((): ScheduleItem | null => {
    const now = new Date();
    return (
      schedule.find((item) => {
        const start = new Date(item.startTime);
        const end = new Date(start.getTime() + item.durationMinutes * 60000);
        return now >= start && now < end;
      }) || null
    );
  }, [schedule]);

  const findNext = useCallback((): ScheduleItem | null => {
    const now = new Date();
    return (
      schedule
        .filter((item) => new Date(item.startTime) > now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null
    );
  }, [schedule]);

  const updateStatus = useCallback(() => {
    const now = new Date();
    const cur = findCurrent();
    const nxt = findNext();

    setCurrent(cur);
    setNext(nxt);

    if (cur) {
      const end = new Date(new Date(cur.startTime).getTime() + cur.durationMinutes * 60000);
      setTimeToEnd(formatDuration(end.getTime() - now.getTime()));
    } else {
      setTimeToEnd("—");
    }

    if (nxt) {
      const diff = new Date(nxt.startTime).getTime() - now.getTime();
      setTimeToNext(formatDuration(diff));
    } else {
      setTimeToNext("—");
    }
  }, [findCurrent, findNext]);

  // ✅ Manual refresh method for components (e.g., Stop Live button)
  const refreshStatus = useCallback(() => updateStatus(), [updateStatus]);

  // ✅ Auto-refresh every 5 seconds
  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [updateStatus]);

  // ✅ React to OBS manual stop events
  useEffect(() => {
    const handleStop = () => {
      setCurrent(null);
      updateStatus(); // refresh to show next event
    };
    return () => window.api.off?.("obs-stream-stopped", handleStop);
  }, [updateStatus]);

  return { current, next, timeToNext, timeToEnd, refreshStatus };
}
