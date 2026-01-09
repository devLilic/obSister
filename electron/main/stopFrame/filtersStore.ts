// filepath: electron/main/stopFrame/filtersStore.ts
import fs from "fs";
import path from "path";
import { app } from "electron";
import {
    StopFrameFilter,
    StopFrameFilterCreatePayload,
    StopFrameFilterPatch,
    StopFrameNotification,
    ScheduleItem,
} from "../../types/types";
import { logAction, logWarn } from "../config/logger";
import { getMainWindow } from "../obs/connection";

const FILE_NAME = "stopframe-filters.json";
let warnedUuidFallback = false;

function getFilePath() {
    return path.join(app.getPath("userData"), FILE_NAME);
}

function safeId(): string {
    // Prefer crypto.randomUUID if available
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const crypto = require("crypto") as typeof import("crypto");

        if (typeof crypto?.randomUUID === "function") {
            return crypto.randomUUID();
        }

        if (!warnedUuidFallback) {
            warnedUuidFallback = true;
            logWarn("⚠️ crypto.randomUUID not available; using fallback ID generator");
            logAction("stopframe_filters_invalid", { reason: "randomUUID_unavailable_fallback_id" });
        }
    } catch (e: any) {
        if (!warnedUuidFallback) {
            warnedUuidFallback = true;
            logWarn(
                `⚠️ Unable to load node:crypto for randomUUID; using fallback ID generator (${e?.message ?? String(e)})`
            );
            logAction("stopframe_filters_invalid", { reason: "crypto_require_failed_fallback_id" });
        }
    }

    // Fallback: stable-enough unique id for local userData JSON (non-security use)
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function emitChanged(filters: StopFrameFilter[]) {
    const win = getMainWindow();
    win?.webContents?.send("stopframe-filters-changed", filters);
}

function emitNotification(n: StopFrameNotification) {
    const win = getMainWindow();
    win?.webContents?.send("stopframe-filters-notification", n);
}

function normalizeFilter(raw: any): StopFrameFilter | null {
    if (!raw || typeof raw !== "object") return null;
    const id = typeof raw.id === "string" && raw.id.trim() ? raw.id : safeId();
    const name = typeof raw.name === "string" ? raw.name : "Untitled filter";
    const enabled = typeof raw.enabled === "boolean" ? raw.enabled : false;
    const shows = Array.isArray(raw.shows) ? raw.shows.filter((s: any) => typeof s === "string") : [];
    const stopFramePath = typeof raw.stopFramePath === "string" ? raw.stopFramePath : "";
    return { id, name, enabled, shows, stopFramePath };
}

export function readStopFrameFilters(): StopFrameFilter[] {
    const filePath = getFilePath();

    if (!fs.existsSync(filePath)) {
        logAction("stopframe_filters_missing", { file: FILE_NAME });
        return [];
    }

    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);

        if (!Array.isArray(data)) {
            logAction("stopframe_filters_invalid", { file: FILE_NAME, reason: "not_array" });
            return [];
        }

        const filters: StopFrameFilter[] = [];
        for (const entry of data) {
            const f = normalizeFilter(entry);
            if (f) filters.push(f);
        }

        logAction("stopframe_filters_loaded", { file: FILE_NAME, count: filters.length });
        return filters;
    } catch (e: any) {
        logWarn(`⚠️ Failed to parse ${FILE_NAME}: ${e?.message ?? String(e)}`);
        logAction("stopframe_filters_invalid", { file: FILE_NAME, reason: "parse_error" });
        return [];
    }
}

export function writeStopFrameFilters(filters: StopFrameFilter[]) {
    const filePath = getFilePath();
    try {
        fs.writeFileSync(filePath, JSON.stringify(filters, null, 2), "utf-8");
        logAction("stopframe_filters_saved", { file: FILE_NAME, count: filters.length });
        emitChanged(filters);
    } catch (e: any) {
        logWarn(`⚠️ Failed to write ${FILE_NAME}: ${e?.message ?? String(e)}`);
    }
}

/**
 * Validare minim safe:
 * - empty/whitespace => invalid
 * - if existsSync available => missing file => invalid
 */
function validateStopFramePath(p: string): { valid: boolean; reason?: "empty_path" | "missing_file" } {
    if (!p || !p.trim()) return { valid: false, reason: "empty_path" };
    try {
        if (!fs.existsSync(p)) return { valid: false, reason: "missing_file" };
    } catch {
        // If existsSync throws, treat as invalid-safe
        return { valid: false, reason: "missing_file" };
    }
    return { valid: true };
}

/**
 * PHASE 4A:
 * - Disable invalid filters (persist enabled=false)
 * - Detect conflicts: same show appears in 2+ enabled+valid filters
 * - Apply stopFramePath into schedule items BEFORE saving schedule.json
 * - Emit notifications (log + IPC event)
 */
export function applyStopFrameFiltersToSchedule(items: ScheduleItem[]): {
    items: ScheduleItem[];
    notifications: StopFrameNotification[];
    filtersAfterValidation: StopFrameFilter[];
} {
    const filters = readStopFrameFilters();
    const notifications: StopFrameNotification[] = [];

    // 1) Validate filters; disable invalid
    let changed = false;
    const validated = filters.map((f) => {
        if (!f.enabled) return f;

        const v = validateStopFramePath(f.stopFramePath);
        if (!v.valid) {
            changed = true;
            const disabled: StopFrameFilter = { ...f, enabled: false };

            notifications.push({
                type: "FILTER_DISABLED_INVALID_STOPFRAME",
                filterId: f.id,
                filterName: f.name,
                stopFramePath: f.stopFramePath,
                reason: v.reason!,
            });

            logAction("stopframe_filter_disabled_invalid", {
                filterId: f.id,
                filterName: f.name,
                stopFramePath: f.stopFramePath,
                reason: v.reason,
            });

            emitNotification(notifications[notifications.length - 1]);
            return disabled;
        }

        return f;
    });

    if (changed) writeStopFrameFilters(validated);

    // 2) Build show -> active filters
    const showToFilters = new Map<string, StopFrameFilter[]>();
    for (const f of validated) {
        if (!f.enabled) continue;
        for (const showRaw of f.shows) {
            const show = (showRaw ?? "").trim();
            if (!show) continue;
            const arr = showToFilters.get(show) ?? [];
            arr.push(f);
            showToFilters.set(show, arr);
        }
    }

    // 3) Conflicts
    const conflictedShows = new Set<string>();
    for (const [show, arr] of showToFilters.entries()) {
        if (arr.length >= 2) {
            conflictedShows.add(show);

            const n: StopFrameNotification = {
                type: "CONFLICT",
                show,
                filterIds: arr.map((x) => x.id),
                filterNames: arr.map((x) => x.name),
            };
            notifications.push(n);

            logAction("stopframe_filters_conflict", {
                show,
                filterIds: n.filterIds,
                filterNames: n.filterNames,
            });

            emitNotification(n);
        }
    }

    // 4) Apply to items
    const out = items.map((item) => {
        const show = (item.name ?? "").trim();
        if (!show) {
            // leave unchanged
            return { ...item, stopFramePath: undefined };
        }

        // conflict => none
        if (conflictedShows.has(show)) {
            return { ...item, stopFramePath: undefined };
        }

        const match = showToFilters.get(show);
        if (!match || match.length === 0) {
            return { ...item, stopFramePath: undefined };
        }

        // single active filter => apply
        const f = match[0];
        return { ...item, stopFramePath: f.stopFramePath };
    });

    logAction("stopframe_filters_applied_to_schedule", {
        itemsIn: items.length,
        itemsOut: out.length,
        filtersActive: validated.filter((f) => f.enabled).length,
        conflicts: conflictedShows.size,
    });

    return { items: out, notifications, filtersAfterValidation: validated };
}

/* ===============================
   CRUD for IPC
   =============================== */

export function listFilters(): StopFrameFilter[] {
    return readStopFrameFilters();
}

export function createFilter(payload: StopFrameFilterCreatePayload): StopFrameFilter[] {
    const filters = readStopFrameFilters();
    const f: StopFrameFilter = {
        id: safeId(),
        name: payload.name ?? "Untitled filter",
        enabled: payload.enabled ?? false,
        shows: Array.isArray(payload.shows) ? payload.shows : [],
        stopFramePath: payload.stopFramePath ?? "",
    };
    const next = [...filters, f];
    writeStopFrameFilters(next);
    return next;
}

export function updateFilter(id: string, patch: StopFrameFilterPatch): StopFrameFilter[] {
    const filters = readStopFrameFilters();
    const next = filters.map((f) => (f.id === id ? { ...f, ...patch, id: f.id } : f));
    writeStopFrameFilters(next);
    return next;
}

export function deleteFilter(id: string): StopFrameFilter[] {
    const filters = readStopFrameFilters();
    const next = filters.filter((f) => f.id !== id);
    writeStopFrameFilters(next);
    return next;
}
