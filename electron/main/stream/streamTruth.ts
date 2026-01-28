// filepath: electron/main/stream/streamTruth.ts
import { StreamEndReason, StreamState, StreamContext, ScheduleItem } from "../../types/types";
import { logAction } from "../config/logger";
import { getMainWindow } from "../obs";
import { loadSchedule } from "../schedule/store";
import {emitStreamContext} from "./streamEvents.ts";
import {loadConfig} from "../config/config.ts";

let streamState: StreamState = "idle";
let streamEndReason: StreamEndReason | null = null;
let activeScheduleItemId: string | null = null;
let hasStopFrameForActiveItem = false;

// Phase 5 idempotency + expected disconnect classification
let endStreamSent = false;
let endStreamSentAt = 0;

// Guards
let lastLoggedState: StreamState = streamState;
let lastLoggedReason: StreamEndReason | null = streamEndReason;
let lastEmittedKey = "";

function actionForReason(reason: StreamEndReason) {
    if (reason === "manual") return "stream_stop_manual" as const;
    if (reason === "duration") return "stream_stop_duration" as const;
    if (reason === "autostop") return "stream_stop_autostop" as const;

    // fallback only for true crash reason
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

    // Decoupled: publish runtime stream context event (no feature imports here)
    emitStreamContext(ctx);
}

function getExpectedDisconnectWindowMs(): number {
    try {
        const cfg = loadConfig();
        const v = cfg?.autoStop?.expectedDisconnectWindowMs;
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.floor(v);
    } catch {
        // ignore, use default
    }
    return 4000;
}

export function markEndStreamSent(): void {
    if (endStreamSent) return;
    endStreamSent = true;
    endStreamSentAt = Date.now();
}

export function resetEndStreamFlags(): void {
    endStreamSent = false;
    endStreamSentAt = 0;
}

export function isEndStreamSent(): boolean {
    return endStreamSent;
}

/**
 * True when disconnect happens soon after we sent End Stream => expected shutdown.
 */
export function isExpectedDisconnectNow(): boolean {
    if (!endStreamSent || endStreamSentAt <= 0) return false;
    const dt = Date.now() - endStreamSentAt;
    return dt >= 0 && dt <= getExpectedDisconnectWindowMs();
}

/**
 * Optional: for logging/telemetry.
 */
export function getEndStreamSentAt(): number {
    return endStreamSentAt;
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
        resetEndStreamFlags();
    }

    if (next === "live") {
        // Once live again, previous stop flags are irrelevant
        resetEndStreamFlags();
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
    resetEndStreamFlags();

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
