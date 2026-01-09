// filepath: electron/main/stopFrame/stopFrameFilters.ts
import fs from "fs";
import path from "path";
import { app } from "electron";
import { logAction, logWarn } from "../config/logger";

const FILE_NAME = "stopframe-filters.json";

export type StopFrameFiltersMap = Map<string, string>; // scheduleItemId -> stopFramePath (full path)

/**
 * Loads stopframe-filters.json from userData.
 * If missing -> empty mapping (NON-IMPACT).
 *
 * Supported tolerant shapes (to avoid breaking if schema evolves):
 * 1) { "<scheduleItemId>": { "stopFramePath": "C:\\...\\frame.png" } }
 * 2) { "<scheduleItemId>": "C:\\...\\frame.png" }
 * 3) [ { "scheduleItemId": "...", "stopFramePath": "C:\\...\\frame.png" }, ... ]
 * Any unknown format -> empty mapping + log action (invalid).
 */
export function loadStopFrameFilters(): StopFrameFiltersMap {
    const filePath = path.join(app.getPath("userData"), FILE_NAME);

    if (!fs.existsSync(filePath)) {
        logAction("stopframe_filters_missing", { file: FILE_NAME });
        return new Map();
    }

    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);

        const map = new Map<string, string>();

        // Shape 3: array entries
        if (Array.isArray(data)) {
            for (const entry of data) {
                const id = entry?.scheduleItemId ?? entry?.id ?? null;
                const stopFramePath = entry?.stopFramePath ?? entry?.path ?? null;
                if (typeof id === "string" && typeof stopFramePath === "string" && stopFramePath.trim()) {
                    map.set(id, stopFramePath);
                }
            }
            logAction("stopframe_filters_loaded", { file: FILE_NAME, count: map.size });
            return map;
        }

        // Shape 1/2: object mapping
        if (data && typeof data === "object") {
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === "string") {
                    if (value.trim()) map.set(key, value);
                    continue;
                }
                const p = (value as any)?.stopFramePath;
                if (typeof p === "string" && p.trim()) map.set(key, p);
            }
            logAction("stopframe_filters_loaded", { file: FILE_NAME, count: map.size });
            return map;
        }

        logAction("stopframe_filters_invalid", { file: FILE_NAME, reason: "unknown_json_shape" });
        return new Map();
    } catch (e: any) {
        logWarn(`⚠️ Failed to parse ${FILE_NAME}: ${e?.message ?? String(e)}`);
        logAction("stopframe_filters_invalid", { file: FILE_NAME, reason: "parse_error" });
        return new Map();
    }
}
