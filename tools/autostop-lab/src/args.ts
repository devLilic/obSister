// FILE: tools/autostop-lab/src/args.ts
import path from "node:path";

export type ScanOptions = {
    video: string;

    fps: number;
    scaleW: number;
    scaleH: number;

    /**
     * Keep only the top ratio of the frame for stability detection (hashing stream).
     * 1.0 = no crop, 0.85 = cut bottom 15% (ticker killer).
     */
    cropTopRatio: number;

    minStableSec: number;
    minGapSec: number;
    maxCandidates: number;

    // Phase 1 tuning
    stableDistanceThreshold: number; // consecutive frame distance <= threshold => stable
    preview: boolean;

    outDir: string | null; // null => auto
    format: "json" | "txt" | "both";
};


function toNum(name: string, v: string | undefined, def: number): number {
    if (v === undefined) return def;
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`Invalid --${name} "${v}" (not a number)`);
    return n;
}

function toInt(name: string, v: string | undefined, def: number): number {
    const n = toNum(name, v, def);
    const i = Math.floor(n);
    if (i < 0) throw new Error(`Invalid --${name} "${v}" (must be >= 0)`);
    return i;
}

function parseScale(scale: string | undefined, defW: number, defH: number) {
    if (!scale) return { w: defW, h: defH };
    const m = scale.toLowerCase().match(/^(\d+)\s*x\s*(\d+)$/);
    if (!m) throw new Error(`Invalid --scale "${scale}". Expected WxH, e.g. 9x8`);
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
        throw new Error(`Invalid --scale "${scale}" (must be positive integers)`);
    }
    return { w, h };
}

function parseBool(v: string | undefined, def: boolean) {
    if (v === undefined) return def;
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "y") return true;
    if (s === "false" || s === "0" || s === "no" || s === "n") return false;
    throw new Error(`Invalid boolean "${v}" (use true/false)`);
}

export function parseArgs(argv: string[]): { cmd: string | null; opts: ScanOptions } {
    const cmd = argv[0] && !argv[0].startsWith("-") ? argv[0] : null;
    const rest = cmd ? argv.slice(1) : argv;

    const map = new Map<string, string | undefined>();
    for (let i = 0; i < rest.length; i++) {
        const a = rest[i];
        if (!a.startsWith("--")) continue;
        const key = a.slice(2);
        const next = rest[i + 1];
        if (!next || next.startsWith("--")) {
            map.set(key, undefined);
        } else {
            map.set(key, next);
            i++;
        }
    }

    const video = map.get("video");
    if (!video || !video.trim()) throw new Error(`Missing required --video <path>`);

    const fps = toNum("fps", map.get("fps"), 3);
    if (fps <= 0) throw new Error(`--fps must be > 0`);

    const scaleRaw = map.get("scale");
    const { w: scaleW, h: scaleH } = parseScale(scaleRaw, 9, 8);

    // ✅ NEW
    const cropTopRatioRaw = toNum("cropTopRatio", map.get("cropTopRatio"), 1);
    const cropTopRatio = Math.max(0.1, Math.min(1, cropTopRatioRaw));

    const minStableSec = toNum("minStableSec", map.get("minStableSec"), 2);
    const minGapSec = toNum("minGapSec", map.get("minGapSec"), 10);
    const maxCandidates = toInt("maxCandidates", map.get("maxCandidates"), 20);

    const stableDistanceThreshold = toInt("stableThreshold", map.get("stableThreshold"), 3);

    const formatRaw = (map.get("format") ?? "both").toLowerCase();
    const format = (formatRaw === "json" || formatRaw === "txt" || formatRaw === "both"
        ? formatRaw
        : "both") as "json" | "txt" | "both";

    const outRaw = map.get("out");
    const outDir = outRaw && outRaw.trim() ? path.resolve(outRaw) : null;

    const preview = parseBool(map.get("preview"), true);

    return {
        cmd,
        opts: {
            video: path.resolve(video),
            fps,
            scaleW,
            scaleH,
            cropTopRatio,
            minStableSec,
            minGapSec,
            maxCandidates,
            stableDistanceThreshold,
            outDir,
            format,
            preview,
        },
    };
}
