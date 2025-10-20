import React, { useEffect, useState } from "react";
import { useScheduleStatus } from "../hooks/useScheduleStatus";

interface ScheduleItem {
  id: string;
  name: string;
  platform: "facebook" | "youtube" | "multi";
  startTime: string;
  durationMinutes: number;
  fbKey?: string;
}

export default function ScheduleStatusPanel() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    window.api.schedule.get().then(setSchedule);
  }, []);

  const { now, current, next, timeToNext, timeToEnd } = useScheduleStatus(schedule);

  return (
    <div className="bg-gray-800 rounded p-4 border border-gray-700 mt-6 text-gray-100">
      <h2 className="text-lg font-semibold mb-2">🕒 Live Schedule Monitor</h2>

      <div className="flex flex-col gap-2 text-sm">
        {current ? (
          <>
            <div className="text-green-400 font-semibold">
              LIVE NOW: {current.name} ({current.platform})
            </div>
            <div className="text-gray-300">
              Ends in: <span className="font-mono">{timeToEnd}</span>
            </div>
          </>
        ) : (
          <div className="text-yellow-400 font-semibold">
            No live streams right now
          </div>
        )}

        {next && (
          <div className="mt-2">
            <div className="text-gray-300">
              Next: <span className="text-blue-400">{next.name}</span>
            </div>
            <div className="text-gray-400">
              Starts in: <span className="font-mono">{timeToNext}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
