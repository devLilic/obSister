// File: src/hooks/useAutoStopViewModel.ts
import { useMemo } from "react";
import { useStreamRuntime } from "../context/StreamRuntimeContext";

export type AutoStopViewModel = {
    isAutoStopEligibleForActiveItem: boolean;
    eligibilityText: string;
    crashNotice?: string;
};

export function useAutoStopViewModel(): AutoStopViewModel {
    const { ctx } = useStreamRuntime();

    const hasStopFrame = Boolean(ctx?.hasStopFrame);
    const endReason = ctx?.streamEndReason ?? null;

    const isAutoStopEligibleForActiveItem = useMemo(() => hasStopFrame, [hasStopFrame]);

    const eligibilityText = useMemo(() => {
        return hasStopFrame
            ? "AutoStop active for this show"
            : "No StopFrame configured → AutoStop inactive";
    }, [hasStopFrame]);

    const crashNotice = useMemo(() => {
        if (endReason !== "obs_crash") return undefined;
        return "OBS disconnected — stream ended";
    }, [endReason]);

    return {
        isAutoStopEligibleForActiveItem,
        eligibilityText,
        crashNotice,
    };
}
