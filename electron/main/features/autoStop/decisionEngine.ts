// FILE: electron/main/features/autoStop/decisionEngine.ts
import type { AppActionType } from "../../../types/types";

/**
 * Logger seam (Node-safe):
 * - In Electron runtime, we try to auto-wire to ../../config/logger via dynamic import.
 * - In Node/CLI (no Electron), this remains no-op by default.
 * - Optional override via setAutoStopLogicLogger().
 */
export type AutoStopLogicLogger = {
    logAction?: (type: AppActionType, payload?: Record<string, any>) => void;
};

let logicLogger: Required<AutoStopLogicLogger> = {
    logAction: () => {},
};

// Best-effort auto-wire to Electron logger WITHOUT hard dependency.
// If it fails (e.g., Node CLI without 'electron'), we keep no-op.
try {
    const mod: any = await import("../../config/logger");
    if (typeof mod?.logAction === "function") {
        logicLogger = { logAction: mod.logAction.bind(mod) };
    }
} catch {
    // no-op in CLI / non-Electron contexts
}

/**
 * Optional injection (tests / CLI can set this explicitly).
 * Passing null resets to no-op (and does NOT attempt Electron auto-wire again).
 */
export function setAutoStopLogicLogger(next: AutoStopLogicLogger | null) {
    if (!next) {
        logicLogger = { logAction: () => {} };
        return;
    }
    logicLogger = {
        logAction: typeof next.logAction === "function" ? next.logAction : () => {},
    };
}

export class DecisionEngine {
    private hits: number[] = [];
    private cooldownUntil = 0;

    constructor(
        private maxDistance: number, // <= this means "match"
        private requiredHits: number,
        private windowSec: number,
        private cooldownSec: number
    ) {}

    register(distance: number): boolean {
        const now = Date.now();
        if (now < this.cooldownUntil) return false;

        if (distance <= this.maxDistance) {
            this.hits.push(now);
            this.hits = this.hits.filter((t) => now - t <= this.windowSec * 1000);

            // Semantics preserved: same action type + same payload shape.
            logicLogger.logAction("autostop_decision_engine_hit", {
                hitsCount: this.hits.length,
                requiredHits: this.requiredHits,
            });
        }

        if (this.hits.length >= this.requiredHits) {
            this.hits = [];
            this.cooldownUntil = now + this.cooldownSec * 1000;
            return true;
        }

        return false;
    }
}
