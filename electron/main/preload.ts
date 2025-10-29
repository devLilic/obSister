// electron/main/preload.ts
import { contextBridge, ipcRenderer } from "electron";
import { ScheduleItem } from "./schedule/types";
import { OBSConfig } from "../types/types";

contextBridge.exposeInMainWorld("api", {
  // -----------------------------
  // ✅ OBS Connection Status
  // -----------------------------
  onOBSStatus: (callback: (status: boolean) => void) => {
    ipcRenderer.on("obs-status", (_, status) => callback(status));
  },

  // -----------------------------
  // ✅ OBS Profile Management
  // -----------------------------
  obsProfiles: {
    getAll: () => ipcRenderer.invoke("obs:getProfiles"),
    set: (name: string) => ipcRenderer.invoke("obs:setProfile", name),
  },

  // -----------------------------
  // ✅ Streaming Control
  // -----------------------------
  stream: {
    start: (key: string) => ipcRenderer.send("start-stream", key),
    stop: () => ipcRenderer.send("stop-stream"),
    startSmart: (key: string, mode: "single" | "multi") =>
      ipcRenderer.invoke("obs:startSmartStream", { key, mode }),
  },

  // -----------------------------
  // ✅ OBS Profile Change Events
  // -----------------------------
  onProfileChanged: (callback: (profileName: string) => void) => {
    ipcRenderer.on("obs-profile-changed", (_, profileName) => callback(profileName));
  },

  // -----------------------------
  // ⚙️ Generic Helpers
  // -----------------------------
  on: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.removeAllListeners(channel)
    ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },

  off: (channel: string, listener: (...args: any[]) => void) =>
    ipcRenderer.removeListener(channel, listener),

  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),


  schedule: {
    get: () => ipcRenderer.invoke("schedule:get"),
    save: (list: ScheduleItem[]) => ipcRenderer.invoke("schedule:save", list),
  },

  config: {
    get: () => ipcRenderer.invoke("config:get"),
    save: (data: OBSConfig) => ipcRenderer.invoke("config:save", data),
  },

  logs: {
    load: () => ipcRenderer.invoke("logs:load"),
    clear: () => ipcRenderer.invoke("logs:clear"),
  },

  google: {
    testConnection: (sheetId: string, keyPath: string, tabName: string) =>
      ipcRenderer.invoke("google:testConnection", { sheetId, keyPath, tabName }),
    syncSchedule: () => ipcRenderer.invoke("google:syncSchedule"),
  },
});
