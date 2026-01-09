// File: src/hooks/useSchedulerBadgeViewModel.ts
import { useMemo } from "react";
import { useScheduleStatusState } from "../context/ScheduleStatusContext";
import { useStreamRuntime } from "../context/StreamRuntimeContext";
import { useSchedule } from "../context/ScheduleContext";

export type SchedulerBadgeViewModel = {
    statusText: string;
    statusColorClass: string;
    showEndsIn: boolean;
    timeToEnd: string;
};

export function useSchedulerBadgeViewModel(): SchedulerBadgeViewModel {
    const { next, timeToNext, timeToEnd } = useScheduleStatusState(); // helper vizual only
    const { items } = useSchedule();
    const { ctx } = useStreamRuntime();

    const isLive = ctx?.streamState === "live" || ctx?.streamState === "ending";
    const activeId = ctx?.activeScheduleItemId ?? null;

    const activeItemName = useMemo(() => {
        if (!activeId) return null;
        return items.find((i) => i.id === activeId)?.name ?? null;
    }, [items, activeId]);

    let statusText = "Idle";
    let statusColorClass = "bg-gray-600";
    let showEndsIn = false;

    if (isLive && activeItemName) {
        statusText = `LIVE: ${activeItemName}`;
        statusColorClass = "bg-green-600";
        showEndsIn = true;
    } else if (next) {
        statusText = `Waiting: ${next.name} in ${timeToNext}`;
        statusColorClass = "bg-yellow-500";
    }

    return { statusText, statusColorClass, showEndsIn, timeToEnd };
}
