// FILE: electron/main/features/autoStop/ffmpegPaths.ts
import path from "node:path";
import fs from "node:fs";
import { logInfo, logError } from "../../config/logger";

export function getFFmpegPath(): string | null {
    const devPath = path.join(process.cwd(), "assets", "bin", "ffmpeg.exe");
    if (fs.existsSync(devPath)) {
        logInfo(`🎬 FFmpeg found (DEV): ${devPath}`);
        return devPath;
    }

    if (process.resourcesPath) {
        const prodPath = path.join(process.resourcesPath, "bin", "ffmpeg.exe");
        if (fs.existsSync(prodPath)) {
            logInfo(`🎬 FFmpeg found (PROD): ${prodPath}`);
            return prodPath;
        }
    }

    logError("❌ FFmpeg NOT FOUND");
    return null;
}
