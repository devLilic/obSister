// File: src/hooks/useAutoStopPanelViewModel.ts
import { useMemo } from "react";
import { useAutoStopRuntime } from "../context/AutoStopRuntimeContext";
import { useStreamRuntime } from "../context/StreamRuntimeContext";

export type AutoStopPanelViewModel = {
    label: string;
    variant: "info" | "success" | "warning" | "error";
    isScanning: boolean;
    isEnabled: boolean; // ✅ Added
    stopFramePath: string | null; // ✅ Added

    // eligibility (passive, from stream context)
    isEligibleForActiveItem: boolean;
    eligibilityText: string;

    // optional: last event for timeline UI (UI decides how to render)
    lastEventType?: string;
};

export function useAutoStopPanelViewModel(): AutoStopPanelViewModel {
    const rt = useAutoStopRuntime();
    const { ctx } = useStreamRuntime();

    const isEligibleForActiveItem = Boolean(ctx?.hasStopFrame);
    const eligibilityText = isEligibleForActiveItem
        ? "AutoStop eligible (StopFrame configured)"
        : "No StopFrame configured → AutoStop inactive";

    const lastEventType = rt.lastAutoStopEvent?.type;

    return useMemo(
        () => ({
            label: rt.autoStopScanStatusLabel,
            variant: rt.autoStopScanVariant,
            isScanning: rt.isScanning,
            isEnabled: rt.isEnabled, // ✅ Added
            stopFramePath: rt.stopFramePath, // ✅ Added
            isEligibleForActiveItem,
            eligibilityText,
            lastEventType,
        }),
        [
            rt.autoStopScanStatusLabel,
            rt.autoStopScanVariant,
            rt.isScanning,
            rt.isEnabled, // ✅ Added
            rt.stopFramePath, // ✅ Added
            isEligibleForActiveItem,
            eligibilityText,
            lastEventType,
        ]
    );
}
