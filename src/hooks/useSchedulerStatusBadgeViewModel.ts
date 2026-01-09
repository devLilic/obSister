// File: src/hooks/useSchedulerStatusBadgeViewModel.ts
import { useMemo } from "react";
import { useSchedule } from "../context/ScheduleContext";
import { useScheduleStatus } from "./useScheduleStatus";
import { useStreamRuntime } from "../context/StreamRuntimeContext";
import { useStreamStatusViewModel } from "./useStreamStatusViewModel";

export type SchedulerBadgeVM = {
    label: string;
    variant: "idle" | "live" | "ending" | "ended" | "error";
    reasonLabel?: string;

    activeItemName?: string;

    // helper vizual (next/countdown)
    nextItemName?: string;
    timeToNext: string;
    timeToEnd: string;

    showEndsIn: boolean;
};

export function useSchedulerStatusBadgeViewModel(): SchedulerBadgeVM {
    const { items } = useSchedule();
    const { next, timeToNext, timeToEnd } = useScheduleStatus(); // helper vizual only
    const { ctx } = useStreamRuntime();
    const streamStatus = useStreamStatusViewModel();

    const activeItemName = useMemo(() => {
        const activeId = ctx?.activeScheduleItemId ?? null;
        if (!activeId) return undefined;
        return items.find((i) => i.id === activeId)?.name ?? undefined;
    }, [ctx?.activeScheduleItemId, items]);

    // ✅ label final pentru badge (păstrăm comportamentul existent: LIVE: <name> / Waiting...)
    const computedLabel = useMemo(() => {
        // dacă Electron spune LIVE/ENDING și avem item, afișăm LIVE: name
        if ((streamStatus.variant === "live" || streamStatus.variant === "ending") && activeItemName) {
            return `LIVE: ${activeItemName}`;
        }

        // dacă nu e live, păstrăm vechiul "Waiting: ..." când există next
        if (next) {
            return `Waiting: ${next.name} in ${timeToNext}`;
        }

        // altfel fallback la streamStatus.label (Idle/Ended etc.)
        // (UI poate decide să nu afișeze ended/reason acum; dar mapping există)
        return streamStatus.label;
    }, [streamStatus.variant, streamStatus.label, activeItemName, next, timeToNext]);

    const showEndsIn = streamStatus.isLive;

    return {
        label: computedLabel,
        variant: streamStatus.variant,
        reasonLabel: streamStatus.reasonLabel,

        activeItemName,

        nextItemName: next?.name,
        timeToNext,
        timeToEnd,

        showEndsIn,
    };
}
