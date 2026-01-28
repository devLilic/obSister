// FILE: tools/autostop-lab/src/paths.ts
import path from "node:path";
import fs from "node:fs";

export function ensureDir(p: string) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function defaultOutDir(videoPath: string) {
    // default: near video => <videoDir>/autostop-lab-out/<videoBaseName>/
    const dir = path.dirname(videoPath);
    const base = path.basename(videoPath).replace(/\.[^.]+$/, "");
    return path.join(dir, "autostop-lab-out", base);
}

export function safeBaseName(p: string) {
    return path.basename(p).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}
