// File: src/context/AutoStopRuntimeContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AutoStopRuntimeEvent, StreamEndReason } from "../../electron/types/types";
import { useStreamRuntime } from "./StreamRuntimeContext";

export type AutoStopScanVariant = "info" | "success" | "warning" | "error";

export type AutoStopRuntimeState = {
    isScanning: boolean;
    lastAutoStopEvent: AutoStopRuntimeEvent | null;

    /**
     * Last stop reason coming from AutoStop runtime stream (scan_stopped.reason).
     * This is NOT the same as StreamContext.streamEndReason, but may correlate.
     */
    lastStopReason: "manual" | "duration" | "obs_crash" | "stopframe_detected" | null;

    /**
     * UI-friendly props (mapping is done here, not in UI):
     */
    autoStopScanStatusLabel: string;
    autoStopScanVariant: AutoStopScanVariant;

    /**
     * Helpful for UI cross-display / debugging
     */
    activeItemId: string | null;
    hasStopFrame: boolean;

    /**
     * Stream-end reason from Electron stream context (may be "autostop")
     */
    streamEndReason: StreamEndReason | null;
};

const AutoStopRuntimeContext = createContext<AutoStopRuntimeState | null>(null);

function mapAutoStopLabelVariant(args: {
    isScanning: boolean;
    lastEvt: AutoStopRuntimeEvent | null;
    lastStopReason: AutoStopRuntimeState["lastStopReason"];
    streamEndReason: StreamEndReason | null;
}): { label: string; variant: AutoStopScanVariant } {
    const { isScanning, lastEvt, lastStopReason, streamEndReason } = args;

    // Highest signal: scanning
    if (isScanning) return { label: "Scanning for StopFrame…", variant: "info" };

    // Event-driven states (passive)
    if (lastEvt?.type === "stopframe_detected") return { label: "StopFrame detected", variant: "success" };
    if (lastEvt?.type === "stream_stop_sent") return { label: "Stop sent", variant: "warning" };

    // Scan stopped reasons
    if (lastStopReason === "stopframe_detected") return { label: "Scan stopped (StopFrame detected)", variant: "success" };
    if (lastStopReason === "manual") return { label: "Scan stopped (manual stop)", variant: "warning" };
    if (lastStopReason === "duration") return { label: "Scan stopped (schedule ended)", variant: "info" };
    if (lastStopReason === "obs_crash") return { label: "Scan stopped (OBS disconnected)", variant: "error" };

    // If stream ended by autostop but scan events are not present (safety)
    if (streamEndReason === "autostop") return { label: "Ended by AutoStop", variant: "success" };

    return { label: "AutoStop idle", variant: "info" };
}

export function AutoStopRuntimeProvider({ children }: { children: React.ReactNode }) {
    const { ctx } = useStreamRuntime();

    const [isScanning, setIsScanning] = useState(false);
    const [lastAutoStopEvent, setLastAutoStopEvent] = useState<AutoStopRuntimeEvent | null>(null);
    const [lastStopReason, setLastStopReason] =
        useState<AutoStopRuntimeState["lastStopReason"]>(null);

    // StrictMode-safe: ignore events after unmount
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        // NOTE: Electron engineer specified this API:
        // window.api.autoStop.onRuntimeEvent((evt) => ...) => unsubscribe()
        const unsubscribe = window.api.autoStop.onRuntimeEvent((evt: AutoStopRuntimeEvent) => {
            if (!mountedRef.current) return;

            setLastAutoStopEvent(evt);

            if (evt.type === "scan_started") {
                setIsScanning(true);
                setLastStopReason(null);
            }

            if (evt.type === "scan_stopped") {
                setIsScanning(false);
                setLastStopReason(evt.reason);
            }

            if (evt.type === "stopframe_detected") {
                // scanning may continue briefly depending on Electron logic; do not force stop
                // (React must not decide anything)
            }

            if (evt.type === "stream_stop_sent") {
                // purely informational
            }
        });

        return () => {
            mountedRef.current = false;
            unsubscribe();
        };
    }, []);

    const activeItemId = ctx?.activeScheduleItemId ?? null;
    const hasStopFrame = Boolean(ctx?.hasStopFrame);
    const streamEndReason = (ctx?.streamEndReason ?? null) as StreamEndReason | null;

    const { label, variant } = useMemo(
        () =>
            mapAutoStopLabelVariant({
                isScanning,
                lastEvt: lastAutoStopEvent,
                lastStopReason,
                streamEndReason,
            }),
        [isScanning, lastAutoStopEvent, lastStopReason, streamEndReason]
    );

    const value = useMemo<AutoStopRuntimeState>(
        () => ({
            isScanning,
            lastAutoStopEvent,
            lastStopReason,
            autoStopScanStatusLabel: label,
            autoStopScanVariant: variant,
            activeItemId,
            hasStopFrame,
            streamEndReason,
        }),
        [isScanning, lastAutoStopEvent, lastStopReason, label, variant, activeItemId, hasStopFrame, streamEndReason]
    );

    return <AutoStopRuntimeContext.Provider value={value}>{children}</AutoStopRuntimeContext.Provider>;
}

export function useAutoStopRuntime() {
    const ctx = useContext(AutoStopRuntimeContext);
    if (!ctx) throw new Error("useAutoStopRuntime must be used within AutoStopRuntimeProvider");
    return ctx;
}
