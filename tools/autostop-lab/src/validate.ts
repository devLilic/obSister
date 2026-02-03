// FILE: tools/autostop-lab/src/validate.ts
import path from "node:path";
import fs from "node:fs";

import type { ValidateOptions } from "./args";
import { ensureDir, defaultOutDir, safeBaseName } from "./paths";
import { resolveFFmpegPaths, spawnRawGrayFrames, readImageAsRawGray, getVideoDurationSec } from "./ffmpeg";
import { toTimecode } from "./timecode";
import { writeValidateOutputs, type ValidateReport, type TestedResult, type GroundTruth, type TestedParams } from "./validateReport";

// IMPORTANT: reuse production logic-only (DecisionEngine + hashing)
import { DecisionEngine, dHashFromGray9x8, hammingDistance64 } from "../../../electron/main/features/autoStop/logic";

// ---------- helpers ----------

type TimelinePoint = { frameIndex: number; tSec: number; distance: number };

function clampInt(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, Math.floor(n)));
}

function uniqSortedInts(nums: number[]) {
    return Array.from(new Set(nums.map((x) => Math.floor(x)))).sort((a, b) => a - b);
}

function inWindow(t: number, gt: GroundTruth) {
    return t >= gt.startSec && t <= gt.endSec;
}

/**
 * Deterministic "fake time" wrapper for DecisionEngine(Date.now()) usage.
 * We override Date.now() so engine behavior depends on frame timestamps, not wall clock.
 */
function withFakeNow<T>(fn: () => T) {
    const orig = Date.now;
    try {
        return fn();
    } finally {
        Date.now = orig;
    }
}

function setFakeNowMs(ms: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Date as any).now = () => ms;
}

// ---------- Ground truth detection ----------

function median(values: number[]) {
    if (values.length === 0) return 0;
    const a = [...values].sort((x, y) => x - y);
    const mid = Math.floor(a.length / 2);
    if (a.length % 2 === 0) return (a[mid - 1] + a[mid]) / 2;
    return a[mid];
}

/**
 * Find a "clear peak cluster" (best similarity).
 * - peak = minimum distance
 * - cluster = contiguous region where distance <= peak + margin
 * detectability rule:
 * - median - peak >= minContrast
 */
function detectGroundTruth(tl: TimelinePoint[], opts?: { margin?: number; minContrast?: number }): GroundTruth | null {
    if (tl.length === 0) return null;

    const distances = tl.map((p) => p.distance);
    const med = median(distances);

    let peak = Infinity;
    let peakIdx = 0;
    for (let i = 0; i < tl.length; i++) {
        if (tl[i].distance < peak) {
            peak = tl[i].distance;
            peakIdx = i;
        }
    }

    const margin = opts?.margin ?? 2; // peak+2 is usually tight enough for stopframe
    const minContrast = opts?.minContrast ?? 3;

    if (med - peak < minContrast) {
        return null; // no clear peak vs normal variation
    }

    const thr = peak + margin;

    // expand from peakIdx
    let left = peakIdx;
    while (left - 1 >= 0 && tl[left - 1].distance <= thr) left--;

    let right = peakIdx;
    while (right + 1 < tl.length && tl[right + 1].distance <= thr) right++;

    const startSec = tl[left].tSec;
    const endSec = tl[right].tSec;

    return {
        startSec,
        endSec,
        peakDistance: clampInt(peak, 0, 64),
        peakScore: 64 - clampInt(peak, 0, 64),
    };
}

// ---------- resampling timeline for different fps ----------

function resampleTimelineToFps(baseline: TimelinePoint[], baselineFps: number, targetFps: number): TimelinePoint[] {
    if (baseline.length === 0) return [];
    if (targetFps === baselineFps) return baseline;

    const durationSec = baseline[baseline.length - 1].tSec;
    const out: TimelinePoint[] = [];

    // sample times at k/targetFps and pick nearest baseline point at/after that time
    const step = 1 / targetFps;
    let t = 0;
    let i = 0;

    while (t <= durationSec + 1e-9) {
        while (i < baseline.length - 1 && baseline[i].tSec < t) i++;
        const p = baseline[i];
        out.push({
            frameIndex: out.length + 1,
            tSec: t,
            distance: p.distance,
        });
        t += step;
    }

    return out;
}

// ---------- parameter generation ----------

function autoThresholdsFromPeak(peakDistance: number): number[] {
    // conservative list around peak:
    // peak..peak+8, but clamped
    const base = clampInt(peakDistance, 0, 64);
    const out: number[] = [];
    for (let d = base; d <= base + 8; d++) out.push(clampInt(d, 0, 64));
    return uniqSortedInts(out);
}

// ---------- decision engine simulation ----------

type SimResult = {
    triggered: boolean;
    triggerTimeSec: number | null;
    firstHitTimeSec: number | null;
    hitsCountAtTrigger: number | null;
};

function simulateDecisionEngine(params: TestedParams, tl: TimelinePoint[]): SimResult {
    // DecisionEngine expects maxDistance as "match" threshold
    const engine = new DecisionEngine(params.thresholdMaxDistance, params.requiredHits, params.windowSec, params.cooldownSec);

    let triggered = false;
    let triggerTimeSec: number | null = null;
    let firstHitTimeSec: number | null = null;

    // We can infer "first hit" by checking distance<=threshold (same as engine)
    for (let i = 0; i < tl.length; i++) {
        const p = tl[i];
        const ms = Math.round(p.tSec * 1000);

        setFakeNowMs(ms);

        if (!firstHitTimeSec && p.distance <= params.thresholdMaxDistance) {
            firstHitTimeSec = p.tSec;
        }

        if (engine.register(p.distance)) {
            triggered = true;
            triggerTimeSec = p.tSec;
            // DecisionEngine does not expose hits count; approximate:
            // at trigger moment, it must be >= requiredHits
            // (we keep minimal diagn.)
            return {
                triggered,
                triggerTimeSec,
                firstHitTimeSec,
                hitsCountAtTrigger: params.requiredHits,
            };
        }
    }

    return { triggered: false, triggerTimeSec: null, firstHitTimeSec, hitsCountAtTrigger: null };
}

// ---------- main runner ----------

export async function runValidate(opts: ValidateOptions) {
    const { ffmpeg, ffprobe } = await resolveFFmpegPaths();

    // output dir
    const outDir = opts.outDir ?? path.join(defaultOutDir(opts.video), "validate_" + safeBaseName(opts.stopframe));
    ensureDir(outDir);

    // basic input checks
    if (!fs.existsSync(opts.video)) throw new Error(`Video not found: ${opts.video}`);
    if (!fs.existsSync(opts.stopframe)) throw new Error(`Stopframe not found: ${opts.stopframe}`);

    // duration (optional)
    const videoDurationSec = ffprobe ? await getVideoDurationSec(ffprobe, opts.video) : null;

    // ---- compute stopframe hash (exact prod style: 9x8 gray -> dHash) ----
    if (opts.scaleW !== 9 || opts.scaleH !== 8) {
        // logic-only dHashFromGray9x8 is fixed at 9x8
        throw new Error(`Validate currently requires --scale 9x8 (got ${opts.scaleW}x${opts.scaleH})`);
    }

    const stopRaw = await readImageAsRawGray({ ffmpegPath: ffmpeg, imagePath: opts.stopframe, w: 9, h: 8 });
    const stopHash = dHashFromGray9x8(stopRaw);

    // ---- baseline scan ----
    const baselineFps = Math.max(...opts.fpsList.map((n) => Math.floor(n)));
    const W = opts.scaleW;
    const H = opts.scaleH;
    const BYTES_PER_FRAME = W * H;

    const proc = spawnRawGrayFrames({
        ffmpegPath: ffmpeg,
        videoPath: opts.video,
        fps: baselineFps,
        w: W,
        h: H,
    });

    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += String(d)));

    const timeline: TimelinePoint[] = [];
    let buf = Buffer.alloc(0);
    let frameIndex = 0;

    await new Promise<void>((resolve, reject) => {
        proc.stdout.on("data", (chunk: Buffer) => {
            buf = Buffer.concat([buf, chunk]);

            while (buf.length >= BYTES_PER_FRAME) {
                const frame = buf.subarray(0, BYTES_PER_FRAME);
                buf = buf.subarray(BYTES_PER_FRAME);

                frameIndex++;
                const tSec = frameIndex / baselineFps;
                const h = dHashFromGray9x8(frame);
                const dist = hammingDistance64(stopHash, h);

                timeline.push({ frameIndex, tSec, distance: dist });
            }
        });

        proc.on("error", (e) => reject(e));
        proc.on("exit", (code) => {
            if (code !== 0) {
                return reject(new Error(`ffmpeg scan failed (code=${code}). ${stderr.trim()}`));
            }
            resolve();
        });
    });

    const groundTruth = detectGroundTruth(timeline);

    // If no ground truth => write report and stop
    if (!groundTruth) {
        const report: ValidateReport = {
            meta: {
                tool: "autostop-lab",
                version: "0.1.0",
                git: process.env.GIT_SHA,
                createdAtIso: new Date().toISOString(),
                videoPath: opts.video,
                stopframePath: opts.stopframe,
                videoDurationSec,
                scale: { w: W, h: H },
                grid: {
                    fpsList: opts.fpsList,
                    thresholdList: opts.thresholdList,
                    requiredHitsList: opts.requiredHitsList,
                    windowSecList: opts.windowSecList,
                    maxTests: opts.maxTests,
                },
                mapping: { timestamp: "frameIndex/fps" },
            },
            groundTruth: null,
            bestParams: null,
            testedConfigs: [],
            rejectedSummary: { total: 0, ok: 0, falsePositive: 0, miss: 0 },
        };

        const paths = writeValidateOutputs({ report, outDir, format: opts.format });
        console.log(`❌ No clear ground truth peak. Stopframe likely not detectable in this video.`);
        console.log(`Out: ${outDir}`);
        if (opts.format === "json" || opts.format === "both") console.log(` - report.json: ${paths.jsonPath}`);
        if (opts.format === "txt" || opts.format === "both") console.log(` - report.txt:  ${paths.txtPath}`);
        return;
    }

    // thresholds list
    const thresholdList =
        opts.thresholdList === "auto" ? autoThresholdsFromPeak(groundTruth.peakDistance) : uniqSortedInts(opts.thresholdList);

    // build grid combinations (deterministic ordering)
    const fpsList = uniqSortedInts(opts.fpsList);
    const hitsList = uniqSortedInts(opts.requiredHitsList);
    const winList = uniqSortedInts(opts.windowSecList);

    const combos: TestedParams[] = [];
    const cooldownSecFixed = 10;

    for (const fps of fpsList) {
        for (const thr of thresholdList) {
            for (const hits of hitsList) {
                for (const win of winList) {
                    combos.push({
                        fps,
                        thresholdMaxDistance: clampInt(thr, 0, 64),
                        requiredHits: clampInt(hits, 1, 999),
                        windowSec: clampInt(win, 1, 999),
                        cooldownSec: cooldownSecFixed,
                    });
                }
            }
        }
    }

    // apply maxTests
    const grid = combos.slice(0, opts.maxTests);

    // simulate
    const tested: TestedResult[] = [];

    const summary = { total: 0, ok: 0, falsePositive: 0, miss: 0 };

    withFakeNow(() => {
        for (const p of grid) {
            const tl = resampleTimelineToFps(timeline, baselineFps, p.fps);
            const sim = simulateDecisionEngine(p, tl);

            const triggered = sim.triggered;
            const triggerTimeSec = sim.triggerTimeSec;

            let falsePositive = false;
            let missedDetection = false;
            let latencyFromGTStartSec: number | null = null;

            if (!triggered) {
                missedDetection = true;
            } else {
                falsePositive = !inWindow(triggerTimeSec!, groundTruth);
                latencyFromGTStartSec = triggerTimeSec! - groundTruth.startSec;
            }

            let reason: TestedResult["reason"] = "ok";
            if (missedDetection) reason = "miss";
            else if (falsePositive) reason = "false_positive";

            tested.push({
                params: p,
                triggered,
                triggerTimeSec: triggerTimeSec ?? null,
                latencyFromGTStartSec,
                falsePositive,
                missedDetection,
                firstHitTimeSec: sim.firstHitTimeSec,
                hitsCountAtTrigger: sim.hitsCountAtTrigger,
                reason,
            });

            summary.total++;
            if (reason === "ok") summary.ok++;
            else if (reason === "false_positive") summary.falsePositive++;
            else summary.miss++;
        }
    });

    // choose best params
    const ok = tested
        .filter((x) => x.reason === "ok" && x.triggerTimeSec !== null && x.latencyFromGTStartSec !== null)
        .sort((a, b) => {
            // 1) no false positives already
            // 2) minimal latency
            const la = a.latencyFromGTStartSec ?? 1e9;
            const lb = b.latencyFromGTStartSec ?? 1e9;
            if (la !== lb) return la - lb;

            // 3) prefer lower fps
            if (a.params.fps !== b.params.fps) return a.params.fps - b.params.fps;

            // 4) prefer stricter threshold (lower)
            if (a.params.thresholdMaxDistance !== b.params.thresholdMaxDistance) {
                return a.params.thresholdMaxDistance - b.params.thresholdMaxDistance;
            }

            // 5) prefer fewer hits / smaller window (less lag) after other constraints
            if (a.params.requiredHits !== b.params.requiredHits) return a.params.requiredHits - b.params.requiredHits;
            return a.params.windowSec - b.params.windowSec;
        });

    const best = ok[0] ?? null;

    const report: ValidateReport = {
        meta: {
            tool: "autostop-lab",
            version: "0.1.0",
            git: process.env.GIT_SHA,
            createdAtIso: new Date().toISOString(),
            videoPath: opts.video,
            stopframePath: opts.stopframe,
            videoDurationSec,
            scale: { w: W, h: H },
            grid: {
                fpsList: opts.fpsList,
                thresholdList: opts.thresholdList,
                requiredHitsList: opts.requiredHitsList,
                windowSecList: opts.windowSecList,
                maxTests: opts.maxTests,
            },
            mapping: { timestamp: "frameIndex/fps" },
        },
        groundTruth,
        bestParams: best
            ? {
                ...best.params,
                triggerTimeSec: best.triggerTimeSec!,
                triggerTimecode: toTimecode(best.triggerTimeSec!),
                latencySec: best.latencyFromGTStartSec!,
                falsePositive: false,
            }
            : null,
        testedConfigs: tested,
        rejectedSummary: summary,
    };

    const paths = writeValidateOutputs({ report, outDir, format: opts.format });

    // console summary
    console.log(`✅ Validate complete`);
    console.log(`Out: ${outDir}`);
    if (opts.format === "json" || opts.format === "both") console.log(` - report.json: ${paths.jsonPath}`);
    if (opts.format === "txt" || opts.format === "both") console.log(` - report.txt:  ${paths.txtPath}`);

    console.log(
        `GroundTruth: ${toTimecode(groundTruth.startSec)}..${toTimecode(groundTruth.endSec)} peakDist=${groundTruth.peakDistance}`
    );

    if (!report.bestParams) {
        console.log(`❌ No safe params found (ok=0). Check stopframe quality or tighten GT detection.`);
    } else {
        console.log(
            `Best: fps=${report.bestParams.fps} thr=${report.bestParams.thresholdMaxDistance} hits=${report.bestParams.requiredHits} win=${report.bestParams.windowSec}s -> trigger=${report.bestParams.triggerTimecode} latency=${report.bestParams.latencySec.toFixed(
                3
            )}s`
        );
    }
}
