// FILE: tools/autostop-lab/src/args.ts
import path from "node:path";

export type ScanOptions = {
    video: string;

    fps: number;
    scaleW: number;
    scaleH: number;

    minStableSec: number;
    minGapSec: number;
    maxCandidates: number;

    // Phase 1 tuning
    stableDistanceThreshold: number; // consecutive frame distance <= threshold => stable
    preview: boolean;

    outDir: string | null; // null => auto
    format: "json" | "txt" | "both";
};

export type ValidateOptions = {
    video: string;
    stopframe: string;

    // validation grid
    fpsList: number[]; // e.g. [1,2,3,5]
    thresholdList: number[] | "auto"; // maxDistance list (0..64) or auto
    requiredHitsList: number[]; // e.g. [1,2,3]
    windowSecList: number[]; // e.g. [1,2,3,4]

    maxTests: number;

    // hashing stream params (same as prod default)
    scaleW: number;
    scaleH: number;

    outDir: string | null;
    format: "json" | "txt" | "both";
};

export type Parsed =
    | { cmd: "scan"; opts: ScanOptions }
    | { cmd: "validate"; opts: ValidateOptions }
    | { cmd: string | null; opts: any };

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

function parseListNums(name: string, v: string | undefined, def: number[]): number[] {
    if (v === undefined || !v.trim()) return def;
    const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return def;

    const out = parts.map((p) => {
        const n = Number(p);
        if (!Number.isFinite(n)) throw new Error(`Invalid --${name} list entry "${p}"`);
        return n;
    });

    return out;
}

/**
 * threshold can be:
 * - "auto" (default for validate)
 * - comma list: "6,7,8,9"
 */
function parseThresholdList(v: string | undefined): number[] | "auto" {
    if (v === undefined || !v.trim()) return "auto";
    if (v.trim().toLowerCase() === "auto") return "auto";
    const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return "auto";

    const out = parts.map((p) => {
        const n = Number(p);
        if (!Number.isFinite(n)) throw new Error(`Invalid --threshold list entry "${p}"`);
        const i = Math.floor(n);
        if (i < 0 || i > 64) throw new Error(`--threshold values must be in 0..64 (got ${n})`);
        return i;
    });

    return out;
}

function parseFormat(map: Map<string, string | undefined>) {
    const formatRaw = (map.get("format") ?? "both").toLowerCase();
    return (formatRaw === "json" || formatRaw === "txt" || formatRaw === "both"
        ? formatRaw
        : "both") as "json" | "txt" | "both";
}

function parseArgMap(argv: string[]) {
    const map = new Map<string, string | undefined>();
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith("--")) continue;
        const key = a.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith("--")) {
            map.set(key, undefined);
        } else {
            map.set(key, next);
            i++;
        }
    }
    return map;
}

export function parseArgs(argv: string[]): Parsed {
    const cmd = argv[0] && !argv[0].startsWith("-") ? argv[0] : null;
    const rest = cmd ? argv.slice(1) : argv;
    const map = parseArgMap(rest);

    // common
    const video = map.get("video");
    if (!video || !video.trim()) throw new Error(`Missing required --video <path>`);

    const scaleRaw = map.get("scale");
    const { w: scaleW, h: scaleH } = parseScale(scaleRaw, 9, 8);

    const outRaw = map.get("out");
    const outDir = outRaw && outRaw.trim() ? path.resolve(outRaw) : null;

    const format = parseFormat(map);

    if (cmd === "validate") {
        const stopframe = map.get("stopframe");
        if (!stopframe || !stopframe.trim()) throw new Error(`Missing required --stopframe <path>`);

        const fpsList = parseListNums("fps", map.get("fps"), [1, 2, 3, 5]).map((n) => {
            if (n <= 0) throw new Error(`--fps list values must be > 0`);
            return n;
        });

        const requiredHitsList = parseListNums("requiredHits", map.get("requiredHits"), [1, 2, 3]).map((n) => {
            const i = Math.floor(n);
            if (i <= 0) throw new Error(`--requiredHits must be >= 1`);
            return i;
        });

        const windowSecList = parseListNums("windowSec", map.get("windowSec"), [1, 2, 3, 4]).map((n) => {
            const i = Math.floor(n);
            if (i <= 0) throw new Error(`--windowSec must be >= 1`);
            return i;
        });

        const thresholdList = parseThresholdList(map.get("threshold"));

        const maxTests = toInt("maxTests", map.get("maxTests"), 200);
        if (maxTests <= 0) throw new Error(`--maxTests must be >= 1`);

        return {
            cmd: "validate",
            opts: {
                video: path.resolve(video),
                stopframe: path.resolve(stopframe),
                fpsList,
                thresholdList,
                requiredHitsList,
                windowSecList,
                maxTests,
                scaleW,
                scaleH,
                outDir,
                format,
            },
        };
    }

    // default: scan
    const fps = toNum("fps", map.get("fps"), 3);
    if (fps <= 0) throw new Error(`--fps must be > 0`);

    const minStableSec = toNum("minStableSec", map.get("minStableSec"), 2);
    const minGapSec = toNum("minGapSec", map.get("minGapSec"), 10);
    const maxCandidates = toInt("maxCandidates", map.get("maxCandidates"), 20);

    const stableDistanceThreshold = toInt("stableThreshold", map.get("stableThreshold"), 3);
    const preview = parseBool(map.get("preview"), true);

    return {
        cmd: cmd ?? "scan",
        opts: {
            video: path.resolve(video),
            fps,
            scaleW,
            scaleH,
            minStableSec,
            minGapSec,
            maxCandidates,
            stableDistanceThreshold,
            outDir,
            format,
            preview,
        } satisfies ScanOptions,
    };
}
