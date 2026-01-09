// filepath: electron/main/features/autoStop/ffmpegScanner.ts
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { getFFmpegPath } from "./ffmpegPaths";
import { logInfo, logWarn, logError } from "../../config/logger";

export type RawFrameCallback = (grayFrame: Buffer, index: number) => void;

/**
 * Captures frames from OBS Virtual Camera using FFmpeg (Windows dshow),
 * outputs RAW grayscale 9x8 frames to stdout (72 bytes).
 *
 * FULL FRAME ONLY (no crop).
 */
export class FFmpegScanner {
    private proc: ChildProcessWithoutNullStreams | null = null;
    private frameIndex = 0;

    private readonly W = 9;
    private readonly H = 8;
    private readonly BYTES_PER_FRAME = this.W * this.H; // 72

    private buffer = Buffer.alloc(0);

    constructor(private fps: number, private onFrame: RawFrameCallback) {}

    start() {
        const ffmpeg = getFFmpegPath();
        if (!ffmpeg) {
            logError("⛔ AutoStop aborted — FFmpeg missing");
            return;
        }

        const filters = [`fps=${this.fps}`, `scale=${this.W}:${this.H}`, "format=gray"].join(",");

        const args = [
            "-loglevel",
            "info",
            "-f",
            "dshow",
            "-i",
            "video=OBS Virtual Camera",
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

        logInfo(`🎥 FFmpeg spawn → ${ffmpeg}`);
        logInfo(`🎥 FFmpeg args → ${args.join(" ")}`);

        this.proc = spawn(ffmpeg, args, { windowsHide: true });

        this.proc.on("spawn", () => logInfo("🎥 FFmpeg process started successfully"));
        this.proc.on("error", (err) => logError(`❌ FFmpeg spawn error: ${err.message}`));
        this.proc.on("exit", (code) => logWarn(`⚠️ FFmpeg exited with code ${code}`));

        this.proc.stdout.on("data", (chunk: Buffer) => {
            this.buffer = Buffer.concat([this.buffer, chunk]);

            while (this.buffer.length >= this.BYTES_PER_FRAME) {
                const frame = this.buffer.subarray(0, this.BYTES_PER_FRAME);
                this.buffer = this.buffer.subarray(this.BYTES_PER_FRAME);

                this.frameIndex++;
                this.onFrame(frame, this.frameIndex);
            }
        });
    }

    stop() {
        if (this.proc) {
            this.proc.kill("SIGKILL");
            this.proc = null;
            this.buffer = Buffer.alloc(0);
            logInfo("🛑 FFmpeg scanner stopped");
        }
    }
}
