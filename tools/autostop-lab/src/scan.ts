// FILE: tools/autostop-lab/src/scan.ts
import path from "node:path";
import fs from "node:fs";
import { resolveFFmpegPaths, spawnRawGrayFrames, extractPreviewFrame, getVideoDurationSec } from "./ffmpeg";
import { ensureDir, defaultOutDir, safeBaseName } from "./paths";
import type { ScanOptions } from "./args";
import { buildCandidate, writeOutputs, type Report } from "./report";

// Import logic-only AutoStop helpers (Node-safe)
import { dHashFromGray9x8, hammingDistance64 } from "../../../electron/main/features/autoStop/logic/index";

type StableSegment = {
    startFrame: number; // inclusive
    endFrame: number; // inclusive
    stableFrames: number;
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function frameToSec(frameIndex: number, fps: number) {
    return frameIndex / fps;
}

function midFrame(seg: StableSegment) {
    return Math.floor((seg.startFrame + seg.endFrame) / 2);
}

async function getGitShort(): Promise<string | null> {
    // best-effort; tool must work without git
    try {
        const { spawn } = await import("node:child_process");
        return await new Promise((resolve) => {
            const p = spawn("git", ["rev-parse", "--short", "HEAD"], { windowsHide: true });
            let out = "";
            p.stdout.on("data", (d) => (out += String(d)));
            p.on("exit", (code) => resolve(code === 0 ? out.trim() : null));
            p.on("error", () => resolve(null));
        });
    } catch {
        return null;
    }
}

export async function runScan(opts: ScanOptions) {
    if (!fs.existsSync(opts.video)) throw new Error(`Video not found: ${opts.video}`);

    const outDir = opts.outDir ?? defaultOutDir(opts.video);
    ensureDir(outDir);

    const previewsDir = path.join(outDir, "previews");
    if (opts.preview) ensureDir(previewsDir);

    const { ffmpeg, ffprobe } = await resolveFFmpegPaths();
    const durationSec = ffprobe ? await getVideoDurationSec(ffprobe, opts.video) : null;

    const bytesPerFrame = opts.scaleW * opts.scaleH;
    if (bytesPerFrame <= 0) throw new Error(`Invalid scale: ${opts.scaleW}x${opts.scaleH}`);

    const minStableFrames = Math.max(1, Math.round(opts.minStableSec * opts.fps));
    const stableThr = clamp(opts.stableDistanceThreshold, 0, 64);

    // Spawn ffmpeg -> raw frames
    const proc = spawnRawGrayFrames({
        ffmpegPath: ffmpeg,
        videoPath: opts.video,
        fps: opts.fps,
        w: opts.scaleW,
        h: opts.scaleH,

        // ✅ NEW: ignore bottom ticker for stability detection
        cropTopRatio: opts.cropTopRatio,
    });


    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += String(d)));

    let buf = Buffer.alloc(0);
    let frameIndex = 0;

    let prevHash: bigint | null = null;

    // stable run tracking (consecutive distances <= thr)
    const segments: StableSegment[] = [];

    /**
     * Phase 1 robustness:
     * allow up to 1 single-frame "spike" in the stability window so we don't break on
     * tiny graphics/compression changes (common in broadcast).
     */
    const ALLOWED_BAD_IN_WINDOW = 1;

// We evaluate stability on distances between consecutive frames,
// so for minStableFrames frames, there are (minStableFrames - 1) distances.
    const windowSize = Math.max(1, minStableFrames - 1);

    let win: boolean[] = []; // last windowSize "good" flags
    let badInWin = 0;

    let stableOpen = false;
    let stableStartFrame = 0; // inclusive
    let stableEndFrame = 0; // inclusive

    function openStable(endFrameInclusive: number) {
        stableOpen = true;
        stableStartFrame = endFrameInclusive - windowSize;
        stableEndFrame = endFrameInclusive;
    }

    function extendStable(endFrameInclusive: number) {
        stableEndFrame = endFrameInclusive;
    }

    function closeStable() {
        if (!stableOpen) return;

        const stableFrames = stableEndFrame - stableStartFrame + 1;
        if (stableFrames >= minStableFrames) {
            segments.push({
                startFrame: stableStartFrame,
                endFrame: stableEndFrame,
                stableFrames,
            });
        }

        stableOpen = false;
    }


    // Read stdout frames
    await new Promise<void>((resolve, reject) => {
        proc.stdout.on("data", (chunk: Buffer) => {
            buf = Buffer.concat([buf, chunk]);

            while (buf.length >= bytesPerFrame) {
                const frame = buf.subarray(0, bytesPerFrame);
                buf = buf.subarray(bytesPerFrame);

                frameIndex++;

                const curHash = dHashFromGray9x8(frame.subarray(0, 72)); // supports 9x8 (Phase 1 default)
                // NOTE: Phase 1 spec default 9x8; if user changes scale, hashing needs an updated helper.
                // For now, enforce 9x8 to keep reproducibility and avoid accidental invalid use.
                if (opts.scaleW !== 9 || opts.scaleH !== 8) {
                    reject(new Error(`Phase 1 supports only --scale 9x8 (got ${opts.scaleW}x${opts.scaleH})`));
                    return;
                }

                if (prevHash === null) {
                    prevHash = curHash;

                    // reset window state
                    win = [];
                    badInWin = 0;
                    stableOpen = false;

                    continue;
                }

                const dist = hammingDistance64(prevHash, curHash);
                prevHash = curHash;

                const good = dist <= stableThr;

// push into window
                win.push(good);
                if (!good) badInWin++;

// pop overflow
                if (win.length > windowSize) {
                    const removed = win.shift()!;
                    if (!removed) badInWin--;
                }

// decide only once the window is full
                if (win.length === windowSize) {
                    const stableNow = badInWin <= ALLOWED_BAD_IN_WINDOW;

                    if (stableNow && !stableOpen) {
                        openStable(frameIndex);
                    } else if (stableNow && stableOpen) {
                        extendStable(frameIndex);
                    } else if (!stableNow && stableOpen) {
                        closeStable();
                    }
                }

            }
        });

        proc.on("error", (e) => reject(e));
        proc.on("exit", (code) => {
            // close any pending stable segment
            closeStable();

            if (code !== 0) {
                reject(new Error(`ffmpeg exited with code ${code}. ${stderr.trim()}`));
                return;
            }
            resolve();
        });

    });

    // Convert segments -> raw candidates with score
    const rawCandidates = segments.map((seg) => {
        const stableSec = seg.stableFrames / opts.fps;
        const tSec = frameToSec(midFrame(seg), opts.fps);

        // Simple robust score (Phase 1): stable duration
        // (keeps deterministic behavior)
        const score = stableSec;

        return { seg, stableSec, tSec, score };
    });

    // Sort by score desc, then time asc (deterministic tie-break)
    rawCandidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.tSec - b.tSec;
    });

    // Select top candidates with minGap
    const selected: typeof rawCandidates = [];
    for (const c of rawCandidates) {
        if (selected.length >= opts.maxCandidates) break;
        const okGap = selected.every((s) => Math.abs(s.tSec - c.tSec) >= opts.minGapSec);
        if (!okGap) continue;
        selected.push(c);
    }

    // Final list sorted by tSec asc for readability
    selected.sort((a, b) => a.tSec - b.tSec);

    // Previews (optional)
    const candidatesOut: { tSec: number; stableSec: number; score: number; previewPath?: string }[] = [];
    for (let i = 0; i < selected.length; i++) {
        const c = selected[i];

        let previewPath: string | undefined;
        if (opts.preview) {
            const name = `cand_${String(i + 1).padStart(2, "0")}_${safeBaseName(
                path.basename(opts.video)
            )}_${c.tSec.toFixed(3).replace(".", "_")}s.jpg`;
            const outPath = path.join(previewsDir, name);
            const ok = await extractPreviewFrame({
                ffmpegPath: ffmpeg,
                videoPath: opts.video,
                tSec: c.tSec,
                outPath,
            });
            if (ok) previewPath = outPath;
        }

        candidatesOut.push({ tSec: c.tSec, stableSec: c.stableSec, score: c.score, previewPath });
    }

    // Build report
    const pkgVersion = "0.1.0";
    const git = await getGitShort();

    const report: Report = {
        meta: {
            tool: "autostop-lab",
            version: pkgVersion,
            ...(git ? { git } : {}),
            createdAtIso: new Date().toISOString(),

            videoPath: opts.video,
            videoDurationSec: durationSec,

            fps: opts.fps,
            scale: { w: opts.scaleW, h: opts.scaleH },

            // ✅ NEW
            crop: {
                topRatio: opts.cropTopRatio,
                appliesTo: "hashing_stream_only",
            },

            thresholds: {
                stableDistanceThreshold: stableThr,
                minStableSec: opts.minStableSec,
                minGapSec: opts.minGapSec,
                maxCandidates: opts.maxCandidates,
                allowedBadInWindow: ALLOWED_BAD_IN_WINDOW,
            },
            mapping: { timestamp: "frameIndex/fps" },
        },
        candidates: candidatesOut.map((c) => buildCandidate(c.tSec, c.stableSec, c.score, c.previewPath)),
    };

    const paths = writeOutputs({ report, outDir, format: opts.format });

    // Console summary (operator-friendly)
    console.log(`✅ Scan complete`);
    console.log(`Out: ${outDir}`);
    if (opts.format === "json" || opts.format === "both") console.log(` - report.json: ${paths.jsonPath}`);
    if (opts.format === "txt" || opts.format === "both") console.log(` - report.txt:  ${paths.txtPath}`);
    if (opts.preview) console.log(` - previews:    ${previewsDir}`);
    console.log(`Candidates: ${report.candidates.length}`);
}
