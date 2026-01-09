// File: src/hooks/useStreamStatusViewModel.ts
import { useMemo } from "react";
import { useStreamRuntime } from "../context/StreamRuntimeContext";
import type { StreamContext } from "../../electron/types/types";

export type StreamStatusVariant = "idle" | "live" | "ending" | "ended" | "error";

export type StreamStatusViewModel = {
    label: string;                 // ex: "LIVE NOW", "Idle", "Ending…", "Ended"
    variant: StreamStatusVariant;  // idle|live|ending|ended|error
    reasonLabel?: string;          // doar când ended + endReason
    isLive: boolean;               // helper UI
    streamState: StreamContext["streamState"] | null;
    streamEndReason: StreamContext["streamEndReason"] | null;
};

function mapEndReasonToLabel(reason: StreamContext["streamEndReason"]): string | undefined {
    if (!reason) return undefined;

    switch (reason) {
        case "manual":
            return "Ended manually";
        case "duration":
            return "Ended (schedule time)";
        case "obs_crash":
            return "OBS disconnected — stream ended";
        default:
            return undefined;
    }
}

export function useStreamStatusViewModel(): StreamStatusViewModel {
    const { ctx, loading } = useStreamRuntime();

    return useMemo(() => {
        if (loading && !ctx) {
            // Nu deducem stare; doar UI-friendly while loading.
            return {
                label: "Idle",
                variant: "idle",
                isLive: false,
                streamState: null,
                streamEndReason: null,
            };
        }

        if (!ctx) {
            return {
                label: "Idle",
                variant: "idle",
                isLive: false,
                streamState: null,
                streamEndReason: null,
            };
        }

        const state = ctx.streamState;

        if (state === "live") {
            return {
                label: "LIVE NOW",
                variant: "live",
                isLive: true,
                streamState: ctx.streamState,
                streamEndReason: ctx.streamEndReason ?? null,
            };
        }

        if (state === "ending") {
            return {
                label: "Ending…",
                variant: "ending",
                isLive: true,
                streamState: ctx.streamState,
                streamEndReason: ctx.streamEndReason ?? null,
            };
        }

        if (state === "ended") {
            return {
                label: "Ended",
                variant: "ended",
                reasonLabel: mapEndReasonToLabel(ctx.streamEndReason),
                isLive: false,
                streamState: ctx.streamState,
                streamEndReason: ctx.streamEndReason ?? null,
            };
        }

        // idle
        return {
            label: "Idle",
            variant: "idle",
            isLive: false,
            streamState: ctx.streamState,
            streamEndReason: ctx.streamEndReason ?? null,
        };
    }, [ctx, loading]);
}
