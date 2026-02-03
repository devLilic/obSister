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
    const p = findInPath(binName);
    if (p) return p;

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

    if (envFfmpeg && fs.existsSync(envFfmpeg)) {
        return {
            ffmpeg: path.resolve(envFfmpeg),
            ffprobe: envFfprobe && fs.existsSync(envFfprobe) ? path.resolve(envFfprobe) : null,
        };
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const repoRoot = path.resolve(__dirname, "../../..");
    const repoFfmpeg = path.join(repoRoot, "assets", "bin", "ffmpeg.exe");
    const repoFfprobe = path.join(repoRoot, "assets", "bin", "ffprobe.exe");

    if (!fs.existsSync(repoFfmpeg)) {
        // eslint-disable-next-line no-console
        console.warn(`Repo ffmpeg not found at: ${repoFfmpeg}`);
    }

    if (fs.existsSync(repoFfmpeg)) {
        return {
            ffmpeg: repoFfmpeg,
            ffprobe: fs.existsSync(repoFfprobe) ? repoFfprobe : null,
        };
    }

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
    return await new Promise((resolve) => {
        const args = [
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
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

export function spawnRawGrayFrames(params: { ffmpegPath: string; videoPath: string; fps: number; w: number; h: number }) {
    const { ffmpegPath, videoPath, fps, w, h } = params;

    const filters = [`fps=${fps}`, `scale=${w}:${h}`, "format=gray"].join(",");
    const args = [
        "-v",
        "error",
        "-i",
        videoPath,
        "-vf",
        filters,
        "-an",
        "-sn",
        "-dn",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "gray",
        "pipe:1",
    ];

    const proc = spawn(ffmpegPath, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    return proc;
}

/**
 * Read a single frame from an image file as raw gray (w*h bytes).
 * Used to hash stopframe image exactly like production (9x8 gray).
 */
export async function readImageAsRawGray(params: {
    ffmpegPath: string;
    imagePath: string;
    w: number;
    h: number;
}): Promise<Buffer> {
    const { ffmpegPath, imagePath, w, h } = params;

    if (!fs.existsSync(imagePath)) {
        throw new Error(`Stopframe image not found: ${imagePath}`);
    }

    return await new Promise((resolve, reject) => {
        const filters = [`scale=${w}:${h}`, "format=gray"].join(",");
        const args = [
            "-v",
            "error",
            "-i",
            imagePath,
            "-vf",
            filters,
            "-f",
            "rawvideo",
            "-pix_fmt",
            "gray",
            "pipe:1",
        ];

        const p = spawn(ffmpegPath, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });

        let buf = Buffer.alloc(0);
        let errBuf = "";

        p.stdout.on("data", (d: Buffer) => (buf = Buffer.concat([buf, d])));
        p.stderr.on("data", (d) => (errBuf += String(d)));

        p.on("error", (e) => reject(e));
        p.on("exit", (code) => {
            if (code !== 0) return reject(new Error(`ffmpeg failed reading stopframe (code=${code}): ${errBuf.trim()}`));
            const need = w * h;
            if (buf.length < need) return reject(new Error(`Stopframe raw too small: ${buf.length} bytes, expected ${need}`));
            resolve(buf.subarray(0, need));
        });
    });
}

export async function extractPreviewFrame(params: {
    ffmpegPath: string;
    videoPath: string;
    tSec: number;
    outPath: string;
}): Promise<boolean> {
    const { ffmpegPath, videoPath, tSec, outPath } = params;

    return await new Promise((resolve) => {
        const args = ["-v", "error", "-ss", String(tSec), "-i", videoPath, "-frames:v", "1", "-q:v", "2", outPath, "-y"];
        const p = spawn(ffmpegPath, args, { windowsHide: true });
        p.on("exit", (code) => resolve(code === 0));
        p.on("error", () => resolve(false));
    });
}
