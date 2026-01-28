// FILE: tools/autostop-lab/src/ffmpeg.ts
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "url";

export type FFmpegPaths = {
    ffmpeg: string;
    ffprobe: string | null;
};

function isWin() {
    return process.platform === "win32";
}

function splitPathEnv(p: string | undefined) {
    if (!p) return [];
    return p.split(path.delimiter).filter(Boolean);
}

function existsExe(p: string) {
    try {
        return fs.existsSync(p) && fs.statSync(p).isFile();
    } catch {
        return false;
    }
}

function withExe(extBase: string) {
    if (!isWin()) return extBase;
    return extBase.toLowerCase().endsWith(".exe") ? extBase : `${extBase}.exe`;
}

function findInPath(binName: string): string | null {
    const paths = splitPathEnv(process.env.PATH);
    const exe = withExe(binName);

    for (const dir of paths) {
        const full = path.join(dir, exe);
        if (existsExe(full)) return full;
    }
    return null;
}

async function which(binName: string): Promise<string | null> {
    // Prefer direct PATH scan (fast and cross-platform)
    const p = findInPath(binName);
    if (p) return p;

    // Fallback: "where" on Windows, "which" elsewhere
    const cmd = isWin() ? "where" : "which";
    const exe = withExe(binName);

    return await new Promise((resolve) => {
        const proc = spawn(cmd, [exe], { windowsHide: true });
        let out = "";
        proc.stdout.on("data", (d) => (out += String(d)));
        proc.on("exit", (code) => {
            if (code !== 0) return resolve(null);
            const line = out.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
            resolve(line ?? null);
        });
        proc.on("error", () => resolve(null));
    });
}

export async function resolveFFmpegPaths(): Promise<FFmpegPaths> {
    const envFfmpeg = process.env.FFMPEG_PATH?.trim();
    const envFfprobe = process.env.FFPROBE_PATH?.trim();

    // 1) Explicit env override (highest priority)
    if (envFfmpeg && fs.existsSync(envFfmpeg)) {
        return {
            ffmpeg: path.resolve(envFfmpeg),
            ffprobe: envFfprobe && fs.existsSync(envFfprobe) ? path.resolve(envFfprobe) : null,
        };
    }

    // 2) Repo-local fallback: <repoRoot>/assets/bin/ffmpeg.exe
    // autostop-lab is in: <repoRoot>/tools/autostop-lab/
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const repoRoot = path.resolve(__dirname, "../../..");
    const repoFfmpeg = path.join(repoRoot, "assets", "bin", "ffmpeg.exe");
    const repoFfprobe = path.join(repoRoot, "assets", "bin", "ffprobe.exe");

    if (!fs.existsSync(repoFfmpeg)) {
        // helpful error context
        // (leave this log or remove after confirm)
        // eslint-disable-next-line no-console
        console.warn(`Repo ffmpeg not found at: ${repoFfmpeg}`);
    }

    if (fs.existsSync(repoFfmpeg)) {
        return {
            ffmpeg: repoFfmpeg,
            ffprobe: fs.existsSync(repoFfprobe) ? repoFfprobe : null,
        };
    }

    // 3) PATH lookup (last resort)
    const ffmpeg = (await which("ffmpeg")) ?? "";
    if (!ffmpeg) {
        throw new Error(
            `ffmpeg not found. Expected one of:\n` +
            `- env FFMPEG_PATH\n` +
            `- repo assets/bin/ffmpeg.exe\n` +
            `- ffmpeg in PATH`
        );
    }

    const ffprobe = (await which("ffprobe")) ?? null;
    return { ffmpeg, ffprobe };
}


export async function getVideoDurationSec(ffprobePath: string, videoPath: string): Promise<number | null> {
    // Use ffprobe JSON if available; otherwise return null (Phase 1 ok).
    return await new Promise((resolve) => {
        const args = [
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            videoPath,
        ];
        const p = spawn(ffprobePath, args, { windowsHide: true });
        let out = "";
        p.stdout.on("data", (d) => (out += String(d)));
        p.on("exit", (code) => {
            if (code !== 0) return resolve(null);
            const s = out.trim();
            const n = Number(s);
            if (!Number.isFinite(n)) return resolve(null);
            resolve(n);
        });
        p.on("error", () => resolve(null));
    });
}

export function spawnRawGrayFrames(params: {
    ffmpegPath: string;
    videoPath: string;
    fps: number;
    w: number;
    h: number;

    /**
     * Keep only top ratio of the frame before scaling (hashing stream only).
     * 1.0 = no crop. Example 0.85 cuts bottom 15%.
     */
    cropTopRatio?: number;
}) {
    const { ffmpegPath, videoPath, fps, w, h } = params;
    const cropTopRatio = typeof params.cropTopRatio === "number" ? params.cropTopRatio : 1;

    function buildCropTopFilter(r: number): string | null {
        if (!Number.isFinite(r) || r >= 0.999) return null;
        const clamped = Math.max(0.1, Math.min(1, r));
        // keep top part, cut bottom dynamic ticker area
        return `crop=in_w:trunc(in_h*${clamped}):0:0`;
    }

    const crop = buildCropTopFilter(cropTopRatio);

    // Order matters: fps -> crop -> scale -> gray
    const filtersParts = [`fps=${fps}`];
    if (crop) filtersParts.push(crop);
    filtersParts.push(`scale=${w}:${h}`, "format=gray");

    const filters = filtersParts.join(",");
    const args = [
        "-v", "error",
        "-i", videoPath,
        "-vf", filters,
        "-an", "-sn", "-dn",
        "-f", "rawvideo",
        "-pix_fmt", "gray",
        "pipe:1",
    ];

    const proc = spawn(ffmpegPath, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    return proc;
}


export async function extractPreviewFrame(params: {
    ffmpegPath: string;
    videoPath: string;
    tSec: number;
    outPath: string;
}): Promise<boolean> {
    const { ffmpegPath, videoPath, tSec, outPath } = params;

    return await new Promise((resolve) => {
        const args = [
            "-v", "error",
            "-ss", String(tSec),
            "-i", videoPath,
            "-frames:v", "1",
            "-q:v", "2",
            outPath,
            "-y",
        ];
        const p = spawn(ffmpegPath, args, { windowsHide: true });
        p.on("exit", (code) => resolve(code === 0));
        p.on("error", () => resolve(false));
    });
}
