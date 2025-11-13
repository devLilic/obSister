import { useScheduleStatus } from "../hooks/useScheduleStatus";

export default function SchedulerStatusBadge() {

  // Get live/next/time statuses
  const { current, next, timeToNext, timeToEnd } = useScheduleStatus();

  let statusText = "Idle";
  let statusColor = "bg-gray-600";

  if (current) {
    statusText = `LIVE: ${current.name}`;
    statusColor = "bg-green-600";
  } else if (next) {
    statusText = `Waiting: ${next.name} in ${timeToNext}`;
    statusColor = "bg-yellow-500";
  }

  return (
    <div className="flex items-center gap-2 ml-2">
      <span className={`inline-block w-3 h-3 rounded-full shadow-md ${statusColor}`}></span>
      <span className="text-sm font-medium text-gray-200">{statusText}</span>

      {current && (
        <span className="text-xs text-gray-400 ml-2">
          (Ends in {timeToEnd})
        </span>
      )}
    </div>
  );
}
