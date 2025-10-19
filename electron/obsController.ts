import OBSWebSocket from "obs-websocket-js";
import { logInfo, logError, logWarn } from "./logger";
import { BrowserWindow } from "electron";
import { loadConfig } from "./config";

const obs = new OBSWebSocket();

let isConnected = false;
let mainWindowRef: BrowserWindow | null = null;
let reconnectInterval: NodeJS.Timeout | null = null;


export function setMainWindow(win: BrowserWindow) {
  mainWindowRef = win;
}

export async function testGetInputs() {
  try {
    const response = await obs.call("GetProfileList");
    console.log("Profiles LIST:", response);
  } catch (error: any) {
    console.error("❌ Error requests:", error.message);
  }

}

async function tryConnect(){
  const cfg = loadConfig();
  try {
    await obs.connect(cfg.host, cfg.password);
    logInfo(`✅ Connected to OBS WebSocket (${cfg.host})`);
    isConnected = true;
    mainWindowRef?.webContents.send("obs-status", true);

    if(reconnectInterval){
        clearInterval(reconnectInterval);
        reconnectInterval = null;
        logInfo("🟢 Stopped reconnect loop (connection established)");
    }
  } catch (error: any) {
    logWarn(`OBS not reachable (${error.message}). Retrying in ${cfg.retryDelay / 1000}s...`);
    isConnected = false;
    mainWindowRef?.webContents.send("obs-status", false);
  }
}

export async function startOBSConnectionLoop() {
  const cfg = loadConfig();
  logInfo("🔄 Starting OBS connection loop...");
  await tryConnect();

  if (!reconnectInterval) {
    reconnectInterval = setInterval(tryConnect, cfg.retryDelay); // retry every 5 seconds
  }
}

export function setupOBSListeners() {
  obs.on("ConnectionOpened", () => {
    logInfo("🔌 OBS connection established");
    isConnected = true;
    mainWindowRef?.webContents.send("obs-status", true);
  });

  obs.on("ConnectionClosed", () => {
    logWarn("⚠️ OBS connection lost");
    isConnected = false;
    mainWindowRef?.webContents.send("obs-status", false);

    if (!reconnectInterval) startOBSConnectionLoop();

  });

  obs.on("Identified", () => logInfo("OBS WebSocket authenticated"));

  obs.on("StreamStateChanged", (data) => {
    logInfo(`Stream state: ${data.outputState}`);
  });
}

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

export async function stopStream() {
  try {
    await obs.call("StopStream");
    logInfo("⏹ Stream stopped successfully");
  } catch (error: any) {
    logError(`Failed to stop stream: ${error.message}`);
  }
}

export function getOBSStatus() {
  return isConnected;
}


// -------------------- PROFILE MANAGEMENT --------------------

export async function getProfileList() {
  try {
    const res = await obs.call("GetProfileList");
    // Example: { currentProfileName: 'Multi Stream', profiles: ['Multi Stream', 'SingleStream'] }
    logInfo(`📋 OBS Profiles: ${res.profiles.join(", ")} | Current: ${res.currentProfileName}`);
    return res;
  } catch (error: any) {
    logError(`Failed to get profile list: ${error.message}`);
    return { currentProfileName: null, profiles: [] };
  }
}

/**
 * Switch OBS to another profile
 */
export async function setCurrentProfile(profileName: string) {
  try {
    await obs.call("SetCurrentProfile", { profileName });
    logInfo(`🔄 Switched to OBS profile: ${profileName}`);
    return true;
  } catch (error: any) {
    logError(`Failed to set profile "${profileName}": ${error.message}`);
    return false;
  }
}