import OBSWebSocket from "obs-websocket-js";
import { logInfo, logError, logWarn } from "./logger";
import { BrowserWindow } from "electron";

const obs = new OBSWebSocket();

let isConnected = false;
let mainWindowRef: BrowserWindow | null = null;
let reconnectInterval: NodeJS.Timeout | null = null;
const OBS_URL = "ws://192.168.100.2:4455";
const OBS_PASSWORD = "mxQr49s3ts9gLqsB";

export function setMainWindow(win: BrowserWindow) {
  mainWindowRef = win;
}

async function tryConnect(){
    try {
    await obs.connect(OBS_URL, OBS_PASSWORD);
    logInfo("✅ Connected to OBS WebSocket");
    isConnected = true;
    mainWindowRef?.webContents.send("obs-status", true);

    if(reconnectInterval){
        clearInterval(reconnectInterval);
        reconnectInterval = null;
        logInfo("🟢 Stopped reconnect loop (connection established)");
    }
  } catch (error: any) {
    logWarn(`OBS not reachable (${error.message}). Will retry...`);
    isConnected = false;
    mainWindowRef?.webContents.send("obs-status", false);
  }
}

export async function startOBSConnectionLoop() {
  logInfo("🔄 Starting OBS connection loop...");
  await tryConnect();

  if (!reconnectInterval) {
    reconnectInterval = setInterval(tryConnect, 5000); // retry every 5 seconds
  }
}


// export async function connectOBS() {
//   try {
//     await obs.connect("ws://192.168.100.2:4455", "mxQr49s3ts9gLqsB");
//     logInfo("✅ Connected to OBS WebSocket");
//     isConnected = true;
//     mainWindowRef?.webContents.send("obs-status", true);
//   } catch (error: any) {
//     logError(`❌ Failed to connect to OBS: ${error.message}`);
//     isConnected = false;
//     mainWindowRef?.webContents.send("obs-status", false);
//   }
// }

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
      settings: { key: streamKey },
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
