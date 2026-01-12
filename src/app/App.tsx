// src/app/App.tsx
import ObsStatus from "../components/obs/ObsStatus";
import ScheduleList from "../components/ScheduleList";
import ScheduleStatusPanel from "../components/ScheduleStatusPanel";
import AutoStopPanel from "../components/obs/AutoStopPanel.tsx";


export default function App() {
  return (
      <div className="flex flex-col gap-6 min-h-[600px]">
        <div className="flex justify-between w-full">
            <ScheduleStatusPanel />
            <AutoStopPanel />
        </div>
        <ScheduleList />
        <ObsStatus />

      </div>
  );
}
