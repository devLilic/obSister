// filepath: electron/main/obs/controller.ts
import { obs } from "./connection";
import { logInfo, logError } from "../config/logger";
import { ensureProfile } from "./profile";
import type { StreamEndReason } from "../../types/types";
import {markStopInitiated, markEnded, markEndStreamSent, isEndStreamSent} from "../stream/streamTruth";

/**
 * Start a normal RTMP stream (usually Facebook)
 */
export async function startStream(streamKey: string) {
  try {
    await obs.call("SetStreamServiceSettings", {
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        service: "Custom Live",
        server: "rtmp://localhost/live",
        key: streamKey,
        // service: "Facebook Live",
        // server: "rtmps://live-api-s.facebook.com:443/rtmp/",
        // key: streamKey,
      },
    });
    await obs.call("StartStream");
    logInfo("▶️ Stream started successfully");
  } catch (error: any) {
    logError(`Failed to start stream: ${error.message}`);
  }
}

/**
 * Stop stream (tag reason only; flow unchanged)
 */
export async function stopStream(reason: StreamEndReason = "manual") {
  try {
    // Phase 1/5: tag stop initiation (state -> ending)
    markStopInitiated(reason);

    // Phase 5 idempotency: never send End Stream twice
    if (isEndStreamSent()) {
      logInfo("⏭️ StopStream skipped (already sent)");
      return;
    }

    // Mark sent BEFORE calling OBS (for expected-disconnect window)
    markEndStreamSent();

    await obs.call("StopStream");

    // we mark ended optimistically; OBS events may also update state
    markEnded(reason);

    logInfo("⏹ Stream stopped successfully");
  } catch (error: any) {
    logError(`Failed to stop stream: ${error.message}`);
  }
}


/**
 * Ensure correct profile before starting (Single vs Multi)
 */
export async function startSmartStream(streamKey: string, mode: "single" | "multi") {
  const required = mode === "single" ? "SingleStream" : "MultiStream";
  const ok = await ensureProfile(required);
  if (!ok) {
    logError("Stream aborted — could not ensure correct profile.");
    return;
  }
  await startStream(streamKey);
}
