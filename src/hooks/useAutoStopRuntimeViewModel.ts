// File: src/hooks/useAutoStopRuntimeViewModel.ts
import { useMemo } from "react";
import { useAutoStopRuntime } from "../context/AutoStopRuntimeContext";
import { useStreamRuntime } from "../context/StreamRuntimeContext";

export type AutoStopRuntimeVariant =
    | "off"
    | "scanning"
    | "detected"
    | "end_sent"
    | "skipped"
    | "unknown";

export type AutoStopRuntimeViewModel = {
    variant: AutoStopRuntimeVariant;
    label: string;        // UI-friendly, gata de afișat
    detail?: string;

    itemId?: string | null;

    // helpers (UI poate ignora)
    isScanning: boolean;
};

export function useAutoStopRuntimeViewModel(): AutoStopRuntimeViewModel {
    const {
        isScanning,
        lastAutoStopEvent,
        lastStopReason,
        autoStopScanStatusLabel,
    } = useAutoStopRuntime();

    const { ctx } = useStreamRuntime();

    return useMemo<AutoStopRuntimeViewModel>(() => {
        // 🔴 OBS crash overrides everything (Electron authority)
        if (ctx?.streamEndReason === "obs_crash") {
            return {
                variant: "skipped",
                label: "Skipped: OBS disconnected — stream ended",
                isScanning: false,
            };
        }

        // 🟡 Actively scanning
        if (isScanning) {
            return {
                variant: "scanning",
                label: "Scanning for StopFrame…",
                isScanning: true,
            };
        }

        // 🟢 Event-driven states
        if (lastAutoStopEvent) {
            switch (lastAutoStopEvent.type) {
                case "stopframe_detected":
                    return {
                        variant: "detected",
                        label: "StopFrame detected",
                        itemId: lastAutoStopEvent.itemId,
                        isScanning: false,
                    };

                case "stream_stop_sent":
                    return {
                        variant: "end_sent",
                        label: "End stream signal sent",
                        itemId: lastAutoStopEvent.itemId,
                        isScanning: false,
                    };

                case "scan_stopped":
                    return {
                        variant: "skipped",
                        label: mapScanStoppedReason(lastStopReason),
                        itemId: lastAutoStopEvent.itemId,
                        isScanning: false,
                    };
            }
        }

        // 🟣 Fallback
        return {
            variant: "off",
            label: autoStopScanStatusLabel || "AutoStop idle",
            isScanning: false,
        };
    }, [
        isScanning,
        lastAutoStopEvent,
        lastStopReason,
        autoStopScanStatusLabel,
        ctx?.streamEndReason,
    ]);
}

function mapScanStoppedReason(
    reason: "manual" | "duration" | "obs_crash" | "stopframe_detected" | null
): string {
    if (reason === "manual") return "Scan stopped (manual stop)";
    if (reason === "duration") return "Scan stopped (schedule ended)";
    if (reason === "obs_crash") return "Scan stopped (OBS disconnected)";
    if (reason === "stopframe_detected") return "Scan stopped (StopFrame detected)";
    return "Scan stopped";
}
