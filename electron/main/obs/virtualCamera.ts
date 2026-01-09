// filepath: electron/main/obs/virtualCamera.ts
import { obs } from "./connection";
import { logAction, logWarn } from "../config/logger";

/**
 * OBS WebSocket methods:
 * - StartVirtualCam / StopVirtualCam exist in OBS WebSocket v5+ (OBS 28+).
 * We keep this fail-safe: if unsupported, we just return false and log.
 */
export async function startVirtualCamera(): Promise<boolean> {
    try {
        await obs.call("StartVirtualCam");
        logAction("virtualcam_start");
        return true;
    } catch (e: any) {
        logAction("virtualcam_start_failed", { msg: e?.message ?? String(e) });
        logWarn(`⚠️ VirtualCam start failed: ${e?.message ?? String(e)}`);
        return false;
    }
}

export async function stopVirtualCamera(): Promise<boolean> {
    try {
        await obs.call("StopVirtualCam");
        logAction("virtualcam_stop");
        return true;
    } catch (e: any) {
        logAction("virtualcam_stop_failed", { msg: e?.message ?? String(e) });
        logWarn(`⚠️ VirtualCam stop failed: ${e?.message ?? String(e)}`);
        return false;
    }
}
