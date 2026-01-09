// filepath: electron/main/ipc/stopFramesPreview.ipc.ts
import { ipcMain, dialog, nativeImage } from "electron";
import fs from "fs";
import path from "path";
import { logAction, logWarn } from "../config/logger";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function isAllowedExt(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    return ALLOWED_EXT.has(ext);
}

export function registerStopFramesPreviewIpc() {
    // ✅ openPreview: absolutePath -> dataUrl|null
    ipcMain.handle("stopFrames:openPreview", async (_e, absolutePath: string) => {
        try {
            if (typeof absolutePath !== "string" || !absolutePath.trim()) {
                logAction("stopframe_preview_invalid", { reason: "empty_path" });
                return null;
            }

            const p = absolutePath.trim();

            if (!isAllowedExt(p)) {
                logAction("stopframe_preview_invalid", { reason: "disallowed_extension", path: p });
                return null;
            }

            let stat: fs.Stats;
            try {
                stat = fs.statSync(p);
            } catch {
                logAction("stopframe_preview_invalid", { reason: "file_not_found", path: p });
                return null;
            }

            if (!stat.isFile()) {
                logAction("stopframe_preview_invalid", { reason: "not_a_file", path: p });
                return null;
            }

            if (stat.size > MAX_BYTES) {
                logAction("stopframe_preview_invalid", {
                    reason: "file_too_large",
                    path: p,
                    size: stat.size,
                    max: MAX_BYTES,
                });
                return null;
            }

            const img = nativeImage.createFromPath(p);
            if (img.isEmpty()) {
                logAction("stopframe_preview_invalid", { reason: "nativeImage_empty", path: p });
                return null;
            }

            const dataUrl = img.toDataURL();
            if (!dataUrl || dataUrl.length < 32) {
                logAction("stopframe_preview_invalid", { reason: "empty_dataurl", path: p });
                return null;
            }

            return dataUrl;
        } catch (e: any) {
            logWarn(`⚠️ stopFrames:openPreview failed: ${e?.message ?? String(e)}`);
            logAction("stopframe_preview_invalid", { reason: "exception" });
            return null;
        }
    });

    // ✅ selectImage (optional, recommended)
    ipcMain.handle("stopFrames:selectImage", async () => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ["openFile"],
                filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
            });

            if (result.canceled || !result.filePaths?.[0]) return null;
            return result.filePaths[0];
        } catch (e: any) {
            logWarn(`⚠️ stopFrames:selectImage failed: ${e?.message ?? String(e)}`);
            logAction("stopframe_preview_invalid", { reason: "select_image_exception" });
            return null;
        }
    });
}
