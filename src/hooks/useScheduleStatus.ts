import { useEffect, useState } from "react";
import { ScheduleItem } from "../../electron/main/schedule/types";

interface ScheduleStatus {
  now: Date;
  next?: ScheduleItem;
  current?: ScheduleItem;
  timeToNext?: string;
  timeToEnd?: string;
}

export function useScheduleStatus(schedule: ScheduleItem[]) {
  const [status, setStatus] = useState<ScheduleStatus>({ now: new Date() });

  useEffect(() => {
    const update = () => {
      const now = new Date();

      let current: ScheduleItem | undefined;
      let next: ScheduleItem | undefined;

      for (const item of schedule) {
        const start = new Date(item.startTime);
        const end = new Date(start.getTime() + item.durationMinutes * 60000);

        if (now >= start && now <= end) current = item;
        if (start > now && (!next || start < new Date(next.startTime))) next = item;
      }

      const diff = (a: Date, b: Date) => {
        const ms = a.getTime() - b.getTime();
        const min = Math.floor(ms / 60000);
        const sec = Math.floor((ms % 60000) / 1000);
        return `${min}:${sec.toString().padStart(2, "0")}`;
      };

      const timeToNext = next ? diff(new Date(next.startTime), now) : undefined;
      const timeToEnd = current
        ? diff(new Date(new Date(current.startTime).getTime() + current.durationMinutes * 60000), now)
        : undefined;

      setStatus({
        now,
        current,
        next,
        timeToNext,
        timeToEnd,
      });
    };

    update();
    const interval = setInterval(update, 1000); // every second
    return () => clearInterval(interval);
  }, [schedule]);

  return status;
}
