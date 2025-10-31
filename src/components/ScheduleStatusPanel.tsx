import { useEffect, useState } from "react";
import { useScheduleStatus } from "../hooks/useScheduleStatus";
import { ScheduleItem } from "../../electron/types/types";

export default function ScheduleStatusPanel() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    window.api.schedule.get().then(setSchedule);
  }, []);

  const { current, next, timeToNext, timeToEnd, refreshStatus } = useScheduleStatus(schedule);

  const stopCurrentLive = async () => {
    if (!current) return;
    setIsStopping(true);
    try {
      await window.api.stream.stop(); // 🔹 stop streaming in OBS
      // 🔹 Immediately update the panel to next show
      refreshStatus(); // hook method that recomputes current/next
    } catch (err) {
      console.error("Failed to stop stream:", err);
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded p-4 border border-gray-700 mt-6 text-gray-100">
      <h2 className="text-lg font-semibold mb-2">🕒 Live Schedule Monitor</h2>

      <div className="flex flex-col gap-2 text-sm">
        {current ? (
          <>
            <div className="text-green-400 font-semibold flex items-center justify-between">
              <span>
                LIVE NOW: {current.name} ({current.platform})
              </span>
              <button
                onClick={stopCurrentLive}
                disabled={isStopping}
                className={`ml-3 px-3 py-1 rounded text-white ${
                  isStopping
                    ? "bg-gray-600 cursor-wait"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isStopping ? "Stopping..." : "⏹ Stop Live"}
              </button>
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
