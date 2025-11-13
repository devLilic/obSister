import { useState } from "react";
import { useSchedule } from "../context/ScheduleContext";
import { useScheduleStatus } from "../hooks/useScheduleStatus";

export default function ScheduleStatusPanel() {
  const { setItemStatus } = useSchedule();
  const { current, next, timeToNext, timeToEnd, refreshStatus } = useScheduleStatus();

  const [isStopping, setIsStopping] = useState(false);

  const stopCurrentLive = async () => {
    if (!current) return;
    setIsStopping(true);

    try {
      // Stop streaming in OBS
      await window.api.stream.stop();

      // Mark schedule item as terminated
      await setItemStatus(current.id, "terminated");

      // Recompute current/next
      refreshStatus();
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

        {/* CURRENT LIVE */}
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

        {/* NEXT ITEM */}
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
