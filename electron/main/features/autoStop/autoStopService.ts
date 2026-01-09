// filepath: electron/main/features/autoStop/autoStopService.ts
import { FFmpegScanner } from "./ffmpegScanner";
import { dHashFromGray9x8, hammingDistance64, logMatchDebug } from "./analyzer";
import { DecisionEngine } from "./decisionEngine";
import { logInfo, logWarn, logError } from "../../config/logger";
import type { AutoStopConfig } from "../../../types/types";

/**
 * Runtime enforcement requirements:
 * - service can be started with a reference image path (stopFramePath)
 * - service emits a trigger callback on stopframe detection (one decision only)
 * - service can be stopped idempotently (cleanup safe)
 * - service exposes enabled + lead window minutes
 */
class AutoStopService {
    private scanner: FFmpegScanner | null = null;
    private engine: DecisionEngine | null = null;

    private refHash: bigint | null = null;
    private running = false;

    private onTriggered: (() => void) | null = null;

    private config: AutoStopConfig = {
        enabled: false,
        fps: 3,
        threshold: 0.2,
        requiredHits: 3,
        windowSec: 3,
        cooldownSec: 10,
        endingLeadMin: 1,
    };

    private async computeReferenceHashFromImage(imagePath: string): Promise<bigint> {
        const { spawn } = await import("child_process");
        const { getFFmpegPath } = await import("./ffmpegPaths");
        const ffmpeg = getFFmpegPath();

        if (!ffmpeg) throw new Error("FFmpeg missing");

        return await new Promise<bigint>((resolve, reject) => {
            const args = [
                "-loglevel",
                "error",
                "-i",
                imagePath,
                "-vf",
                "scale=9:8,format=gray",
                "-f",
                "rawvideo",
                "-pix_fmt",
                "gray",
                "pipe:1",
            ];

            const p = spawn(ffmpeg, args, { windowsHide: true });
            let buf = Buffer.alloc(0);

            p.stdout.on("data", (d: Buffer) => {
                buf = Buffer.concat([buf, d]);
            });

            p.on("error", (err) => reject(err));
            p.on("exit", (code) => {
                if (code !== 0) return reject(new Error(`FFmpeg exited ${code} while hashing reference`));
                if (buf.length < 72) return reject(new Error(`Reference conversion returned ${buf.length} bytes, expected 72`));
                const frame = buf.subarray(0, 72);
                resolve(dHashFromGray9x8(frame));
            });
        });
    }

    setConfig(partial: Partial<AutoStopConfig>) {
        this.config = { ...this.config, ...partial };
    }

    isEnabled() {
        return !!this.config.enabled;
    }

    /**
     * Default 5 minutes if not set / invalid.
     */
    getEndingLeadMin(): number {
        const v = this.config.endingLeadMin;
        if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return 5;
        return Math.floor(v);
    }

    /**
     * Kept for compatibility: can be set from UI.
     * Runtime enforcement will call setReferenceImage(stopFramePath) before scanning.
     */
    async setReferenceImage(path: string) {
        try {
            this.refHash = await this.computeReferenceHashFromImage(path);
            this.config.referenceImagePath = path;
            logInfo("📌 AutoStop reference image dHash loaded (9x8 gray)");
        } catch (e: any) {
            logError(`❌ AutoStop failed to load reference image: ${e?.message ?? String(e)}`);
            this.refHash = null;
            this.config.referenceImagePath = undefined;
        }
    }

    /**
     * Runtime-safe start:
     * - requires enabled=true
     * - requires reference hash loaded (or it will refuse)
     * - installs a trigger callback (single decision)
     */
    start(onTriggered?: () => void) {
        if (this.running) return;

        if (!this.config.enabled) {
            logWarn("⚠️ AutoStop start ignored (enabled=false)");
            return;
        }

        if (!this.refHash) {
            logWarn("⚠️ AutoStop start ignored (no reference hash loaded)");
            return;
        }

        const maxDistance = Math.max(0, Math.min(64, Math.round(this.config.threshold * 64)));

        this.onTriggered = typeof onTriggered === "function" ? onTriggered : null;

        this.engine = new DecisionEngine(
            maxDistance,
            this.config.requiredHits,
            this.config.windowSec,
            this.config.cooldownSec
        );

        this.scanner = new FFmpegScanner(
            this.config.fps,
            (grayFrame, index) => void this.onFrame(grayFrame, index, maxDistance),
        );

        this.scanner.start();
        this.running = true;
        logInfo(`🧠 AutoStop scan started (maxDistance=${maxDistance}, fps=${this.config.fps})`);
    }

    stop() {
        this.scanner?.stop();
        this.scanner = null;
        this.engine = null;
        this.onTriggered = null;
        this.running = false;
        logInfo("🛑 AutoStop scan stopped");
    }

    isRunning() {
        return this.running;
    }

    private async onFrame(grayFrame: Buffer, index: number, maxDistance: number) {
        if (!this.engine || !this.refHash) return;

        let cur: bigint;
        try {
            cur = dHashFromGray9x8(grayFrame);
        } catch (e: any) {
            logWarn(`⚠️ Frame #${index} hash error: ${e?.message ?? String(e)}`);
            return;
        }

        const distance = hammingDistance64(this.refHash, cur);
        logMatchDebug(index, distance, maxDistance);

        if (this.engine.register(distance)) {
            // single decision: trigger callback; no stream control here
            logWarn("⛔ AutoStop TRIGGERED — signal emitted (runtime orchestrator will stop stream)");
            const cb = this.onTriggered;
            // prevent double triggers per run
            this.onTriggered = null;
            try {
                cb?.();
            } catch (e: any) {
                logError(`❌ AutoStop trigger callback error: ${e?.message ?? String(e)}`);
            }
        }
    }

    getStatus() {
        return {
            running: this.running,
            enabled: this.config.enabled,
        };
    }
}

/* ✅ singleton getter (safe) */
let instance: AutoStopService | null = null;
export function getAutoStopService(): AutoStopService {
    if (!instance) instance = new AutoStopService();
    return instance;
}
