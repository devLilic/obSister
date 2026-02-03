// FILE: tools/autostop-lab/src/validateReport.ts
import fs from "node:fs";
import path from "node:path";
import { toTimecode } from "./timecode";

export type GroundTruth = {
    startSec: number;
    endSec: number;
    peakDistance: number; // lower is better
    peakScore: number; // e.g. 64 - peakDistance
};

export type TestedParams = {
    fps: number;
    thresholdMaxDistance: number; // 0..64
    requiredHits: number;
    windowSec: number;
    cooldownSec: number;
};

export type TestedResult = {
    params: TestedParams;

    triggered: boolean;
    triggerTimeSec: number | null;

    // evaluation vs ground truth window
    latencyFromGTStartSec: number | null;
    falsePositive: boolean;
    missedDetection: boolean;

    // minimal diagnostics
    firstHitTimeSec: number | null;
    hitsCountAtTrigger: number | null;

    reason: "ok" | "miss" | "false_positive" | "no_ground_truth";
};

export type ValidateReport = {
    meta: {
        tool: string;
        version: string;
        git?: string;
        createdAtIso: string;

        videoPath: string;
        stopframePath: string;
        videoDurationSec?: number | null;

        scale: { w: number; h: number };

        grid: {
            fpsList: number[];
            thresholdList: number[] | "auto";
            requiredHitsList: number[];
            windowSecList: number[];
            maxTests: number;
        };

        mapping: {
            timestamp: "frameIndex/fps";
        };
    };

    groundTruth: GroundTruth | null;

    bestParams:
        | (TestedParams & {
        triggerTimeSec: number;
        triggerTimecode: string;
        latencySec: number;
        falsePositive: false;
    })
        | null;

    testedConfigs: TestedResult[];
    rejectedSummary: {
        total: number;
        ok: number;
        falsePositive: number;
        miss: number;
    };
};

export function formatValidateTxt(r: ValidateReport): string {
    const lines: string[] = [];
    lines.push(`AutoStop Lab — validate stopframe`);
    lines.push(``);
    lines.push(`Video:     ${r.meta.videoPath}`);
    lines.push(`Stopframe: ${r.meta.stopframePath}`);
    if (typeof r.meta.videoDurationSec === "number") lines.push(`Duration:  ${r.meta.videoDurationSec.toFixed(2)}s`);
    lines.push(`Created:   ${r.meta.createdAtIso}`);
    lines.push(`Tool:      ${r.meta.tool} v${r.meta.version}${r.meta.git ? ` (${r.meta.git})` : ""}`);
    lines.push(``);
    lines.push(`Scale: ${r.meta.scale.w}x${r.meta.scale.h}`);
    lines.push(`Mapping: ${r.meta.mapping.timestamp}`);
    lines.push(``);

    if (!r.groundTruth) {
        lines.push(`Ground truth: NOT DETECTED (no clear peak)`);
        lines.push(``);
        lines.push(`Tip: choose a cleaner stopframe or adjust crop/scale in Phase 1.`);
        lines.push(``);
        return lines.join("\n");
    }

    lines.push(
        `Ground truth: ${toTimecode(r.groundTruth.startSec)} .. ${toTimecode(r.groundTruth.endSec)}  ` +
        `(peakDistance=${r.groundTruth.peakDistance}, peakScore=${r.groundTruth.peakScore})`
    );
    lines.push(``);

    if (!r.bestParams) {
        lines.push(`Result: ❌ No safe parameter set found (either miss or false positives).`);
    } else {
        lines.push(`Result: ✅ Best params`);
        lines.push(`  fps=${r.bestParams.fps}`);
        lines.push(`  thresholdMaxDistance=${r.bestParams.thresholdMaxDistance}`);
        lines.push(`  requiredHits=${r.bestParams.requiredHits}`);
        lines.push(`  windowSec=${r.bestParams.windowSec}`);
        lines.push(`  cooldownSec=${r.bestParams.cooldownSec}`);
        lines.push(`  trigger=${r.bestParams.triggerTimecode} (t=${r.bestParams.triggerTimeSec.toFixed(3)}s)`);
        lines.push(`  latencyFromGTStart=${r.bestParams.latencySec.toFixed(3)}s`);
    }

    lines.push(``);
    lines.push(`Tested configs: ${r.testedConfigs.length}`);
    lines.push(`Summary: ok=${r.rejectedSummary.ok}  falsePositive=${r.rejectedSummary.falsePositive}  miss=${r.rejectedSummary.miss}`);
    lines.push(``);

    // show top 10 ok configs as alternatives
    const ok = r.testedConfigs
        .filter((x) => x.reason === "ok")
        .sort((a, b) => {
            // lower latency first, then lower fps
            const la = a.latencyFromGTStartSec ?? 1e9;
            const lb = b.latencyFromGTStartSec ?? 1e9;
            if (la !== lb) return la - lb;
            return a.params.fps - b.params.fps;
        })
        .slice(0, 10);

    if (ok.length > 0) {
        lines.push(`Safe alternatives (top ${ok.length}):`);
        ok.forEach((x, i) => {
            lines.push(
                `  ${String(i + 1).padStart(2, "0")}. fps=${x.params.fps} thr=${x.params.thresholdMaxDistance} hits=${
                    x.params.requiredHits
                } win=${x.params.windowSec}s -> trigger=${toTimecode(x.triggerTimeSec ?? 0)} latency=${(
                    x.latencyFromGTStartSec ?? 0
                ).toFixed(3)}s`
            );
        });
        lines.push(``);
    }

    return lines.join("\n");
}

export function writeValidateOutputs(params: { report: ValidateReport; outDir: string; format: "json" | "txt" | "both" }) {
    const { report, outDir, format } = params;

    const jsonPath = path.join(outDir, "report.json");
    const txtPath = path.join(outDir, "report.txt");

    if (format === "json" || format === "both") {
        fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
    }

    if (format === "txt" || format === "both") {
        fs.writeFileSync(txtPath, formatValidateTxt(report), "utf-8");
    }

    return { jsonPath, txtPath };
}
