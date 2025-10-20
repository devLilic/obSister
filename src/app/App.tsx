// src/app/App.tsx
import LogsPanel from "../components/obs/LogsPanel";
import ObsStatus from "../components/obs/ObsStatus";
import ScheduleList from "../components/ScheduleList";
import ScheduleStatusPanel from "../components/ScheduleStatusPanel";

export default function App() {
  return (
      <div className="flex flex-col gap-6 min-h-[800px]">
        <div className="flex items-center justify-between w-full">
          <ScheduleStatusPanel />
          <ObsStatus />
        </div>
        <ScheduleList />
        <LogsPanel />
      </div>
  );
}
