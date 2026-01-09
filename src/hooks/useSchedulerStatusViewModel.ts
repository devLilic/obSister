// File: src/hooks/useSchedulerStatusViewModel.ts
import { useMemo } from "react";
import { useSchedule } from "../context/ScheduleContext";
import { useScheduleStatusState } from "../context/ScheduleStatusContext";
import { useStreamRuntime } from "../context/StreamRuntimeContext";

export type RuntimeVariant = "idle" | "live" | "ending" | "ended" | "error";

export type SchedulerStatusViewModel = {
    label: string;                 // ex: "LIVE NOW", "Idle", "Ending…", "Ended"
    variant: RuntimeVariant;
    reasonLabel?: string;          // doar când ended
    activeItemName?: string;       // dacă există în schedule store
    isLive: boolean;

    // helper vizual (next/countdown)
    nextName?: string;
    timeToNext: string;
    timeToEnd: string;             // afișat doar când isLive=true (UI decides)
};

function mapReason(reason: string | null | undefined): string | undefined {
    if (!reason) return undefined;
    if (reason === "manual") return "Ended manually";
    if (reason === "duration") return "Ended (schedule time)";
    if (reason === "obs_crash") return "OBS disconnected — stream ended";
    return "Ended";
}

export function useSchedulerStatusViewModel(): SchedulerStatusViewModel {
    const { items } = useSchedule();
    const { next, timeToNext, timeToEnd } = useScheduleStatusState(); // helper vizual only
    const { ctx } = useStreamRuntime();

    const streamState = ctx?.streamState ?? "idle";
    const endReason = ctx?.streamEndReason ?? null;
    const activeId = ctx?.activeScheduleItemId ?? null;

    const activeItemName = useMemo(() => {
        if (!activeId) return undefined;
        return items.find((i) => i.id === activeId)?.name || undefined;
    }, [items, activeId]);

    const variant: RuntimeVariant = useMemo(() => {
        if (streamState === "live") return "live";
        if (streamState === "ending") return "ending";
        if (streamState === "ended") return "ended";
        return "idle";
    }, [streamState]);

    const label = useMemo(() => {
        if (variant === "live") return "LIVE NOW";
        if (variant === "ending") return "Ending…";
        if (variant === "ended") return "Ended";
        return "Idle";
    }, [variant]);

    const reasonLabel = useMemo(() => {
        if (variant !== "ended") return undefined;
        return mapReason(endReason);
    }, [variant, endReason]);

    const isLive = variant === "live" || variant === "ending";

    return {
        label,
        variant,
        reasonLabel,
        activeItemName,
        isLive,
        nextName: next?.name ?? undefined,
        timeToNext,
        timeToEnd,
    };
}
