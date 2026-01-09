// filepath: electron/main/stream/streamTruth.ts
import { StreamEndReason, StreamState, StreamContext, ScheduleItem } from "../../types/types";
import { logAction } from "../config/logger";
import { getMainWindow } from "../obs/connection";
import { loadSchedule } from "../schedule/store";

let streamState: StreamState = "idle";
let streamEndReason: StreamEndReason | null = null;
let activeScheduleItemId: string | null = null;
let hasStopFrameForActiveItem = false;

// Guards
let lastLoggedState: StreamState = streamState;
let lastLoggedReason: StreamEndReason | null = streamEndReason;
let lastEmittedKey = "";

function actionForReason(reason: StreamEndReason) {
    if (reason === "manual") return "stream_stop_manual" as const;
    if (reason === "duration") return "stream_stop_duration" as const;
    return "stream_end_obs_crash" as const;
}

function refreshHasStopFrameFromSchedule() {
    if (!activeScheduleItemId) {
        hasStopFrameForActiveItem = false;
        return;
    }

    const list: ScheduleItem[] = loadSchedule();
    const item = list.find((x) => x.id === activeScheduleItemId);
    const p = item?.stopFramePath;
    hasStopFrameForActiveItem = typeof p === "string" && p.trim().length > 0;
}

function maybeLog() {
    if (streamState !== lastLoggedState) {
        logAction("stream_state_changed", { from: lastLoggedState, to: streamState });
        lastLoggedState = streamState;
    }

    if (streamEndReason !== lastLoggedReason) {
        if (streamEndReason) logAction(actionForReason(streamEndReason), { reason: streamEndReason });
        lastLoggedReason = streamEndReason;
    }
}

function emitContextIfChanged() {
    const ctx = getStreamContext();
    const key = JSON.stringify(ctx);
    if (key === lastEmittedKey) return;
    lastEmittedKey = key;

    const win = getMainWindow();
    win?.webContents?.send("stream-context", ctx);
}

export function getStreamState(): StreamState {
    return streamState;
}

export function getStreamEndReason(): StreamEndReason | null {
    return streamEndReason;
}

export function getActiveScheduleItemId(): string | null {
    return activeScheduleItemId;
}

export function setActiveScheduleItemId(id: string | null) {
    activeScheduleItemId = id;
    refreshHasStopFrameFromSchedule();
    maybeLog();
    emitContextIfChanged();
}

export function setStreamState(next: StreamState) {
    streamState = next;

    if (next === "idle") {
        streamEndReason = null;
        activeScheduleItemId = null;
        hasStopFrameForActiveItem = false;
    }

    maybeLog();
    emitContextIfChanged();
}

export function setStreamEndReason(reason: StreamEndReason | null) {
    streamEndReason = reason;
    maybeLog();
    emitContextIfChanged();
}

export function markStopInitiated(reason: StreamEndReason) {
    if (streamEndReason !== "obs_crash") {
        streamEndReason = reason;
    }

    if (streamState === "live" || streamState === "idle") {
        streamState = "ending";
    }

    maybeLog();
    emitContextIfChanged();
}

export function markEnded(reason: StreamEndReason) {
    if (streamEndReason !== "obs_crash") {
        streamEndReason = reason;
    }
    streamState = "ended";

    maybeLog();
    emitContextIfChanged();
}

export function markLive() {
    streamState = "live";
    if (streamEndReason === "manual" || streamEndReason === "duration") {
        streamEndReason = null;
    }
    maybeLog();
    emitContextIfChanged();
}

export function getStreamContext(): StreamContext {
    const base: StreamContext = {
        streamState,
        activeScheduleItemId,
        hasStopFrame: hasStopFrameForActiveItem,
    };

    if (streamEndReason) base.streamEndReason = streamEndReason;
    return base;
}
