// filepath: electron/main/features/autoStop/autoStopOrchestrator.ts
import fs from "fs";
import { obs } from "../../obs/connection";
import { stopStream } from "../../obs/controller";
import { loadSchedule } from "../../schedule/store";
import { logAction, logWarn } from "../../config/logger";
import type {
    StreamContext,
    ScheduleItem,
    AutoStopRuntimeEvent,
    StreamEndReason,
} from "../../../types/types";
import { getMainWindow } from "../../obs/connection";
import { getAutoStopService } from "./autoStopService";

type StopReason = "manual" | "duration" | "obs_crash" | "stopframe_detected";

let initialized = false;

// runtime state
let scanningItemId: string | null = null;
const scanStartedForItem = new Set<string>(); // per runtime (not persisted)
let virtualCamOn = false;

function emitRuntimeEvent(evt: AutoStopRuntimeEvent) {
    const win = getMainWindow();
    win?.webContents?.send("autostop-runtime", evt);
}

async function startVirtualCam(): Promise<boolean> {
    try {
        // OBS WS v5 request name:
        // StartVirtualCam / StopVirtualCam
        logAction("autostop_virtualcam_start");
        await obs.call("StartVirtualCam");
        virtualCamOn = true;
        return true;
    } catch (e: any) {
        logWarn(`⚠️ AutoStop: StartVirtualCam failed: ${e?.message ?? String(e)}`);
        virtualCamOn = false;
        return false;
    }
}

async function stopVirtualCam(): Promise<void> {
    if (!virtualCamOn) return;
    try {
        logAction("autostop_virtualcam_stop");
        await obs.call("StopVirtualCam");
    } catch (e: any) {
        logWarn(`⚠️ AutoStop: StopVirtualCam failed: ${e?.message ?? String(e)}`);
    } finally {
        virtualCamOn = false;
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

    if (svc.isRunning()) {
        svc.stop();
    }

    if (scanningItemId) {
        emitRuntimeEvent({ type: "scan_stopped", itemId: scanningItemId, reason });
        logAction("autostop_scan_stopped", { itemId: scanningItemId, reason });
    }

    scanningItemId = null;
    await stopVirtualCam();
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
        logAction("autostop_guard_not_started", { reason: "autostop_off" });
        return;
    }

    // Must be live (NOT ending)
    if (ctx.streamState !== "live" && ctx.streamState !== "ending") {
        logAction("autostop_guard_not_started", { reason: "not_live", streamState: ctx.streamState });
        return;
    }

    // Must have active item
    const item = findActiveItem(ctx.activeScheduleItemId);
    if (!item) {
        logAction("autostop_guard_not_started", { reason: "no_active_item" });
        return;
    }

    // Must have valid stopframe
    if (!hasValidStopFramePath(item)) {
        logAction("autostop_guard_not_started", { reason: "no_valid_stopframe", itemId: item.id });
        return;
    }

    // Must be within last N minutes
    const leadMin = svc.getEndingLeadMin(); // default 5
    const untilEnd = minutesUntilEnd(item);

    if (untilEnd > leadMin) {
        logAction("autostop_guard_not_started", {
            reason: "outside_window",
            itemId: item.id,
            untilEndMin: Number(untilEnd.toFixed(2)),
            leadMin,
        });
        return;
    }

    if (untilEnd <= 0) {
        // show already ended; do not start scan
        logAction("autostop_guard_not_started", {
            reason: "already_ended_window",
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
        logAction("autostop_guard_not_started", { reason: "virtualcam_failed", itemId: item.id });
        return;
    }

    // Load reference from schedule item's stopFramePath
    await svc.setReferenceImage(item.stopFramePath!);

    scanningItemId = item.id;
    scanStartedForItem.add(item.id);

    emitRuntimeEvent({ type: "scan_started", itemId: item.id });
    logAction("autostop_scan_started", { itemId: item.id, leadMin });

    // Start scan; on trigger: stop stream (End Stream)
    svc.start(async () => {
        // StopFrame detected
        emitRuntimeEvent({ type: "stopframe_detected", itemId: item.id });
        logAction("autostop_stopframe_detected", { itemId: item.id });

        // Send End Stream (only action)
        emitRuntimeEvent({ type: "stream_stop_sent", itemId: item.id });
        logAction("autostop_stream_stop_sent", { itemId: item.id });

        // Tag reason as autostop (streamTruth will log action + state transitions)
        await stopStream("autostop" as StreamEndReason);

        // Cleanup will also be enforced by stream context change, but do it immediately too
        await ensureScanStopped("stopframe_detected");
    });
}

/**
 * Called from streamTruth.ts on each stream-context emission.
 * This is the single runtime observer.
 */
export async function onStreamContextChanged(ctx: StreamContext) {
    if (!initialized) return;

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
        // choose a conservative reason if none
        await ensureScanStopped((ctx.streamEndReason as StopReason) ?? "duration");
        return;
    }

    // If active item changed away from scanning item -> cleanup
    if (scanningItemId && ctx.activeScheduleItemId !== scanningItemId) {
        await ensureScanStopped("manual"); // treated as operator intervention/transition
        return;
    }

    // Start scan if eligible
    await maybeStartScan(ctx);
}

export function initAutoStopOrchestrator() {
    if (initialized) return;
    initialized = true;
}

export function resetAutoStopOrchestratorRuntime() {
    // optional helper (not required)
    scanStartedForItem.clear();
    scanningItemId = null;
    virtualCamOn = false;
    initialized = false;
}
