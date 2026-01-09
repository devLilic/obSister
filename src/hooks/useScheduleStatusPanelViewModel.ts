// File: src/hooks/useScheduleStatusPanelViewModel.ts
// NOTE: This file extends the existing VM with AutoStop UI-friendly props.
// It DOES NOT add any new runtime control logic.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSchedule } from "../context/ScheduleContext";
import { useScheduleStatusState } from "../context/ScheduleStatusContext";
import { useStreamRuntime } from "../context/StreamRuntimeContext";
import { useAutoStopRuntime } from "../context/AutoStopRuntimeContext";

export type RuntimeVariant = "idle" | "live" | "ending" | "ended" | "error";

export type ScheduleStatusPanelViewModel = {
    // runtime
    label: string;
    variant: RuntimeVariant;
    reasonLabel?: string;

    activeItemName?: string;
    activeItemPlatform?: string;

    nextName?: string;
    timeToNext: string;
    timeToEnd: string;

    // existing controls (unchanged)
    isStopping: boolean;
    stopCurrentLive: () => Promise<void>;

    // eligibility (passive)
    isAutoStopEligibleForActiveItem: boolean;
    eligibilityText: string;

    // FAZA 5A: AutoStop runtime display props (no mapping in UI)
    autoStopScanStatusLabel: string;
    autoStopScanVariant: "info" | "success" | "warning" | "error";
};

function formatDuration(ms: number): string {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds / 60 - hours * 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function mapStreamEndReason(reason: string | null | undefined): string | undefined {
    if (!reason) return undefined;
    if (reason === "manual") return "Ended manually";
    if (reason === "duration") return "Ended (schedule time)";
    if (reason === "obs_crash") return "OBS disconnected — stream ended";
    if (reason === "autostop") return "Ended by AutoStop";
    return "Ended";
}

export function useScheduleStatusPanelViewModel(): ScheduleStatusPanelViewModel {
    const { items, setItemStatus } = useSchedule();
    const { next, timeToNext } = useScheduleStatusState(); // helper visual only (NEXT)
    const { ctx } = useStreamRuntime();
    const autoStop = useAutoStopRuntime();

    const [isStopping, setIsStopping] = useState(false);

    // local tick for countdown refresh (visual only)
    const [nowMs, setNowMs] = useState<number>(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    const streamState = ctx?.streamState ?? "idle";
    const endReason = ctx?.streamEndReason ?? null;
    const activeId = ctx?.activeScheduleItemId ?? null;
    const hasStopFrame = Boolean(ctx?.hasStopFrame);

    const currentItem = useMemo(() => {
        if (!activeId) return null;
        return items.find((i) => i.id === activeId) ?? null;
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
        return mapStreamEndReason(endReason);
    }, [variant, endReason]);

    const timeToEnd = useMemo(() => {
        const isLiveish = variant === "live" || variant === "ending";
        if (!isLiveish || !currentItem) return "—";
        const startMs = new Date(currentItem.startTime).getTime();
        const endMs = startMs + currentItem.durationMinutes * 60_000;
        return formatDuration(endMs - nowMs);
    }, [variant, currentItem, nowMs]);

    // existing behavior: stop current live (manual terminate)
    const stopCurrentLive = useCallback(async () => {
        if (!currentItem) return;
        setIsStopping(true);
        try {
            await window.api.stream.stop(); // unchanged
            await setItemStatus(currentItem.id, "terminated"); // unchanged
        } finally {
            setIsStopping(false);
        }
    }, [currentItem, setItemStatus]);

    return {
        label,
        variant,
        reasonLabel,

        activeItemName: currentItem?.name ?? undefined,
        activeItemPlatform: currentItem?.platform ?? undefined,

        nextName: next?.name ?? undefined,
        timeToNext,
        timeToEnd,

        isStopping,
        stopCurrentLive,

        isAutoStopEligibleForActiveItem: hasStopFrame,
        eligibilityText: hasStopFrame
            ? "AutoStop eligible (StopFrame configured)"
            : "No StopFrame configured → AutoStop inactive",

        // FAZA 5A: pass-through UI-friendly props (already mapped)
        autoStopScanStatusLabel: autoStop.autoStopScanStatusLabel,
        autoStopScanVariant: autoStop.autoStopScanVariant,
    };
}
