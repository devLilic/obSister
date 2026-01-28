// filepath: electron/main/features/autoStop/autoStopOrchestrator.ts
import fs from "fs";
import { startVirtualCamera, stopVirtualCamera} from "../../obs";
import { stopStream } from "../../obs";
import { loadSchedule } from "../../schedule/store";
import { logAction,  logInfo } from "../../config/logger";
import type {
    StreamContext,
    ScheduleItem,
    AutoStopRuntimeEvent,
    StreamEndReason,
} from "../../../types/types";
import { getMainWindow } from "../../obs";
import { getAutoStopService } from "./autoStopService";
import {onStreamContext} from "../../stream/streamEvents.ts";
import {sleep} from "../../utils/sleep.ts";

type StopReason = "manual" | "duration" | "obs_crash" | "stopframe_detected";

let initialized = false;

// subscription handle (decoupled from streamTruth)
let unsubscribeStreamContext: (() => void) | null = null;

// runtime state
let scanningItemId: string | null = null;
const scanStartedForItem = new Set<string>(); // per runtime (not persisted)
// Phase 5 guards / idempotency flags
let virtualCamOn = false;
let virtualCamStopping = false;

let scanRunning = false;
let endStreamSent = false;
let evaluationTimer: NodeJS.Timeout | null = null;

// logging dedupe for guard spam:
// log once per (itemId + reason) while condition remains same
let lastGuardLogItemId: string | null = null;
let lastGuardLogReason: string | null = null;

function resetGuardLogDedupe() {
    lastGuardLogItemId = null;
    lastGuardLogReason = null;
}

function logGuardOnce(itemId: string | null, reason: string, payload?: Record<string, any>) {
    // If no itemId, treat as a separate bucket by reason only.
    const id = itemId ?? "__no_item__";

    if (lastGuardLogItemId === id && lastGuardLogReason === reason) return;

    lastGuardLogItemId = id;
    lastGuardLogReason = reason;

    logAction("autostop_guard_not_started", { reason, ...(payload ?? {}) });
}

function emitRuntimeEvent(evt: AutoStopRuntimeEvent) {
    const win = getMainWindow();
    win?.webContents?.send("autostop-runtime", evt);
}

async function startVirtualCam(): Promise<boolean> {
    // If stopping is in progress, do not start again.
    if (virtualCamStopping) return false;

    const ok = await startVirtualCamera();
    virtualCamOn = ok;
    return ok;
}

async function stopVirtualCam(): Promise<void> {
    // Rule: virtualCamOff only if virtualCamOn === true and virtualCamStopping === false
    if (!virtualCamOn) return;
    if (virtualCamStopping) return;

    virtualCamStopping = true;
    try {
        await stopVirtualCamera();
    } finally {
        virtualCamOn = false;
        virtualCamStopping = false;
    }
}

function findActiveItem(id: string | null): ScheduleItem | null {
    if (!id) return null;
    const list = loadSchedule();
    return list.find((x) => x.id === id) ?? null;
}

function hasValidStopFramePath(item: ScheduleItem | null): boolean {
    const p = item?.stopFramePath?.trim() ?? "";
    if (!p) return false;
    try {
        return fs.existsSync(p);
    } catch {
        return false;
    }
}

function minutesUntilEnd(item: ScheduleItem): number {
    const start = new Date(item.startTime).getTime();
    const end = start + item.durationMinutes * 60_000;
    const now = Date.now();
    return (end - now) / 60_000;
}

async function ensureScanStopped(reason: StopReason) {
    const svc = getAutoStopService();

    // stop scan idempotent
    if (scanRunning && svc.isRunning()) {
        svc.stop();
    }
    scanRunning = false;

    if (scanningItemId) {
        emitRuntimeEvent({ type: "scan_stopped", itemId: scanningItemId, reason });
        logAction("autostop_scan_stopped", { itemId: scanningItemId, reason });
    }

    scanningItemId = null;

    // virtual cam off idempotent (guarded)
    await stopVirtualCam();

    // Note: we do NOT reset endStreamSent here, because we may need
    // it for expected disconnect window logic in streamTruth/controller.
    // But orchestrator local flag can be cleared safely after cleanup:
    endStreamSent = true; // stays true for this run once sent

    if (evaluationTimer) {
        clearInterval(evaluationTimer);
        evaluationTimer = null;
        logInfo("🧠 AutoStop Orchestrator: evaluation timer cleared");
    }
}


function stopScanIfRunning(): void {
    const svc = getAutoStopService();

    // Rule: ffmpeg.stop only if scanRunning === true
    if (!scanRunning) return;

    if (svc.isRunning()) {
        svc.stop();
    }

    scanRunning = false;
}

async function sendEndStreamOnce(reason: StreamEndReason): Promise<void> {
    // Rule: sendEndStream only if endStreamSent === false
    if (endStreamSent) return;

    endStreamSent = true;
    await stopStream(reason);
}



/**
 * Decide if we should start scanning right now.
 * Spec conditions (ALL must be true):
 * - AutoStop global ON
 * - exists activeScheduleItem
 * - activeScheduleItem.stopFramePath exists and is valid
 * - streamState = live
 * - minutesUntilEnd <= N (config, default 5)
 * - VirtualCamera can be started
 *
 * Scan starts only once per item.
 */
async function maybeStartScan(ctx: StreamContext) {
    const svc = getAutoStopService();

    // Guard: global ON
    if (!svc.isEnabled()) {
        logGuardOnce(ctx.activeScheduleItemId, "autostop_off");
        return;
    }


    // Must be live (NOT ending)
    if (ctx.streamState !== "live" && ctx.streamState !== "ending") {
        logGuardOnce(ctx.activeScheduleItemId, "not_live", { streamState: ctx.streamState });
        return;
    }


    // Must have active item
    const item = findActiveItem(ctx.activeScheduleItemId);
    if (!item) {
        logGuardOnce(ctx.activeScheduleItemId, "no_active_item");
        return;
    }


    // Must have valid stopframe
    if (!hasValidStopFramePath(item)) {
        logGuardOnce(item.id, "no_valid_stopframe", { itemId: item.id });
        return;
    }


    // Must be within last N minutes
    const leadMin = svc.getEndingLeadMin(); // default 5
    const untilEnd = minutesUntilEnd(item);

    if (untilEnd > leadMin) {
        logGuardOnce(item.id, "outside_window", {
            itemId: item.id,
            untilEndMin: Number(untilEnd.toFixed(2)),
            leadMin,
        });
        return;
    }


    if (untilEnd <= 0) {
        logGuardOnce(item.id, "already_ended_window", {
            itemId: item.id,
            untilEndMin: Number(untilEnd.toFixed(2)),
        });
        return;
    }

    // Start only once per item
    if (scanStartedForItem.has(item.id) || scanningItemId === item.id) {
        return;
    }

    // Start VirtualCam first
    const okCam = await startVirtualCam();
    if (!okCam) {
        logGuardOnce(item.id, "virtualcam_failed", { itemId: item.id });
        return;
    }

    // Load reference from schedule item's stopFramePath
    await svc.setReferenceImage(item.stopFramePath!);

    scanningItemId = item.id;
    scanStartedForItem.add(item.id);

    // new scan is starting -> reset guard dedupe window
    resetGuardLogDedupe();

// Phase 5: per-item flags reset
    scanRunning = false;
    endStreamSent = false;

    emitRuntimeEvent({ type: "scan_started", itemId: item.id, stopFramePath: item.stopFramePath });
    logAction("autostop_scan_started", { itemId: item.id, leadMin });

    // Start scan; on trigger: stop stream (End Stream)
    svc.start(async () => {
        // StopFrame detected
        emitRuntimeEvent({ type: "stopframe_detected", itemId: item.id });
        logAction("autostop_stopframe_detected", { itemId: item.id });

        // Phase 5 preferred shutdown order:
        // 1) stopScan
        stopScanIfRunning();

        // 2) virtualCamOff
        await stopVirtualCam();

        // 3) delay after scan/cam off
        const afterScanDelay = svc.getDelayAfterScanMs();
        await sleep(afterScanDelay);

        // 4) send End Stream (idempotent)
        emitRuntimeEvent({ type: "stream_stop_sent", itemId: item.id });
        logAction("autostop_stream_stop_sent", { itemId: item.id });

        await sendEndStreamOnce("autostop" as StreamEndReason);

        // 5) delay around End Stream (stabilization)
        const aroundEndDelay = svc.getDelayAroundEndStreamMs();
        await sleep(aroundEndDelay);

        // 6) rest cleanup (idempotent)
        await ensureScanStopped("stopframe_detected");
    });
    scanRunning = true;
}

/**
 * Called from streamTruth.ts on each stream-context emission.
 * This is the single runtime observer.
 */
export async function onStreamContextChanged(ctx: StreamContext) {
    if (!initialized) return;

    logInfo(`🧠 AutoStop Orchestrator: processing stream context change (state=${ctx.streamState})`);

    const svc = getAutoStopService();

    // ✅ Requirement: AutoStop must be globally enabled when a stream is live
    if (ctx.streamState === "live" && !svc.isEnabled()) {
        logAction("autostop_auto_enable", { reason: "stream_live" });
        svc.setConfig({ enabled: true });
        emitRuntimeEvent({ type: "enabled_changed", enabled: true });
    }



    // Cleanup conditions (must ALWAYS execute):
    // a) stopframe detection -> handled immediately via ensureScanStopped
    // b) manual stop -> ctx.streamEndReason === manual OR state transitions to ending/ended/idle
    // c) duration stop -> ctx.streamEndReason === duration OR ended/idle
    // d) obs crash -> ctx.streamEndReason === obs_crash OR ended/idle
    if (ctx.streamEndReason === "obs_crash") {
        await ensureScanStopped("obs_crash");
        return;
    }

    if (ctx.streamEndReason === "manual") {
        await ensureScanStopped("manual");
        return;
    }

    if (ctx.streamEndReason === "duration") {
        await ensureScanStopped("duration");
        return;
    }

    // State-based cleanup (covers cases where endReason is missing but stream ends)
    if (ctx.streamState === "ended" || ctx.streamState === "idle") {
        await ensureScanStopped((ctx.streamEndReason as StopReason) ?? "duration");

        // Reset dedupe so next run can log first guard again
        resetGuardLogDedupe();

        if (ctx.streamState === "idle") {
            scanStartedForItem.clear();
        }

        return;
    }


    // If active item changed away from scanning item -> cleanup
    if (scanningItemId && ctx.activeScheduleItemId !== scanningItemId) {
        await ensureScanStopped("manual"); // treated as operator intervention/transition
        return;
    }

    // Reset guard-log dedupe when active item changes away
    if (lastGuardLogItemId && ctx.activeScheduleItemId && lastGuardLogItemId !== ctx.activeScheduleItemId) {
        resetGuardLogDedupe();
    }
    if (!ctx.activeScheduleItemId && lastGuardLogItemId !== null) {
        // went to no item
        resetGuardLogDedupe();
    }

    // Start scan if eligible
    await maybeStartScan(ctx);

    // If stream is live but scan hasn't started yet, ensure evaluation timer is running
    if (ctx.streamState === "live" && !scanningItemId && !evaluationTimer) {
        evaluationTimer = setInterval(() => {
            // We need a fresh context if possible, but at least we re-evaluate with current time
            void maybeStartScan(ctx);
        }, 10_000); // Check every 10 seconds
    }
}

export function initAutoStopOrchestrator() {
    if (initialized) return;

    logAction("autostop_orchestrator_init");
    initialized = true;

    // Subscribe to runtime stream context changes (decoupled from streamTruth)
    if (!unsubscribeStreamContext) {
        unsubscribeStreamContext = onStreamContext((ctx) => {
            void onStreamContextChanged(ctx);
        });
    }
}

export function resetAutoStopOrchestratorRuntime() {
    logAction("autostop_orchestrator_reset");

    if (evaluationTimer) {
        clearInterval(evaluationTimer);
        evaluationTimer = null;
    }

    // Unsubscribe from stream context events
    if (unsubscribeStreamContext) {
        unsubscribeStreamContext();
        unsubscribeStreamContext = null;
    }

    scanStartedForItem.clear();
    scanningItemId = null;
    virtualCamOn = false;
    initialized = false;
}

