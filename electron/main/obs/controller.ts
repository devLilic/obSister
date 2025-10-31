import { obs } from "./connection";
import { logInfo, logError } from "../config/logger";
import { ensureProfile } from "./profile";

/**
 * Start a normal RTMP stream (usually Facebook)
 */
export async function startStream(streamKey: string) {
  try {
    await obs.call("SetStreamServiceSettings", {
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        service: "Facebook Live",
        server: "rtmps://live-api-s.facebook.com:443/rtmp/",
        key: streamKey,
      },
    });
    await obs.call("StartStream");
    logInfo("▶️ Stream started successfully");
  } catch (error: any) {
    logError(`Failed to start stream: ${error.message}`);
  }
}

/**
 * Stop stream
 */
export async function stopStream() {
  try {
    await obs.call("StopStream");
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
