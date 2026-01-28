// FILE: tools/autostop-lab/src/report.ts
import fs from "node:fs";
import path from "node:path";
import { toTimecode } from "./timecode";
// import type { ScanOptions } from "./args";

export type Candidate = {
    tSec: number;
    timecode: string;
    stableSec: number;
    score: number;
    previewPath?: string;
};

export type Report = {
    meta: {
        tool: string;
        version: string;
        git?: string;
        createdAtIso: string;

        videoPath: string;
        videoDurationSec?: number | null;

        fps: number;
        scale: { w: number; h: number };

        // ✅ NEW (reproducibility)
        crop?: {
            topRatio: number; // 1.0 = no crop
            appliesTo: "hashing_stream_only";
        };

        thresholds: {
            stableDistanceThreshold: number;
            minStableSec: number;
            minGapSec: number;
            maxCandidates: number;

            /**
             * Phase 1 robustness:
             * allow up to N "bad" distances (> stableDistanceThreshold) inside the stability window
             */
            allowedBadInWindow: number;
        };
        mapping: {
            timestamp: "frameIndex/fps";
        };
    };
    candidates: Candidate[];
};


export function formatTxt(r: Report): string {
    const lines: string[] = [];
    lines.push(`AutoStop Lab — stopframe candidates`);
    lines.push(``);
    lines.push(`Video: ${r.meta.videoPath}`);
    if (typeof r.meta.videoDurationSec === "number") {
        lines.push(`Duration: ${r.meta.videoDurationSec.toFixed(2)}s`);
    }
    lines.push(`Created: ${r.meta.createdAtIso}`);
    lines.push(`Tool: ${r.meta.tool} v${r.meta.version}${r.meta.git ? ` (${r.meta.git})` : ""}`);
    lines.push(``);
    lines.push(`Params:`);
    lines.push(`  fps=${r.meta.fps}`);
    lines.push(`  scale=${r.meta.scale.w}x${r.meta.scale.h}`);
    if (r.meta.crop) {
        lines.push(`Crop (hashing): topRatio=${r.meta.crop.topRatio}`);
    }
    lines.push(`  stableDistanceThreshold<=${r.meta.thresholds.stableDistanceThreshold}`);
    lines.push(`  minStableSec=${r.meta.thresholds.minStableSec}s`);
    lines.push(`  minGapSec=${r.meta.thresholds.minGapSec}s`);
    lines.push(`  maxCandidates=${r.meta.thresholds.maxCandidates}`);
    lines.push(`  timestampMapping=${r.meta.mapping.timestamp}`);
    lines.push(``);
    lines.push(`Candidates (${r.candidates.length}):`);
    lines.push(``);

    r.candidates.forEach((c, i) => {
        lines.push(
            `${String(i + 1).padStart(2, "0")}. ${c.timecode}  (t=${c.tSec.toFixed(3)}s)  stable=${c.stableSec.toFixed(
                2
            )}s  score=${c.score.toFixed(2)}${c.previewPath ? `  preview=${c.previewPath}` : ""}`
        );
    });

    lines.push(``);
    return lines.join("\n");
}

export function buildCandidate(tSec: number, stableSec: number, score: number, previewPath?: string): Candidate {
    return {
        tSec,
        timecode: toTimecode(tSec),
        stableSec,
        score,
        ...(previewPath ? { previewPath } : {}),
    };
}

export function writeOutputs(params: {
    report: Report;
    outDir: string;
    format: "json" | "txt" | "both";
}) {
    const { report, outDir, format } = params;

    const jsonPath = path.join(outDir, "report.json");
    const txtPath = path.join(outDir, "report.txt");

    if (format === "json" || format === "both") {
        fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
    }

    if (format === "txt" || format === "both") {
        fs.writeFileSync(txtPath, formatTxt(report), "utf-8");
    }

    return { jsonPath, txtPath };
}
