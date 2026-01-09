// filepath: electron/main/preload.ts
import { contextBridge, ipcRenderer } from "electron";
import {
  OBSConfig,
  ScheduleItem,
  ScheduleItemStatus,
  AutoStopConfig,
  AutoStopStatus,
  StreamContext,
  StopFrameFilter,
  StopFrameFilterCreatePayload,
  StopFrameFilterPatch,
  StopFrameNotification,
  AutoStopRuntimeEvent,
} from "../types/types";

contextBridge.exposeInMainWorld("api", {
  onOBSStatus: (callback: (status: boolean) => void) => {
    ipcRenderer.on("obs-status", (_, status) => callback(status));
  },

  obsProfiles: {
    getAll: () => ipcRenderer.invoke("obs:getProfiles"),
    set: (name: string) => ipcRenderer.invoke("obs:setProfile", name),
  },

  stream: {
    start: (key: string) => ipcRenderer.send("start-stream", key),
    stop: () => ipcRenderer.send("stop-stream"),
    startSmart: (key: string, mode: "single" | "multi") =>
        ipcRenderer.invoke("obs:startSmartStream", { key, mode }),

    getContext: (): Promise<StreamContext> => ipcRenderer.invoke("stream:getContext"),

    onContext: (callback: (ctx: StreamContext) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, ctx: StreamContext) => callback(ctx);
      ipcRenderer.on("stream-context", listener);
      return () => ipcRenderer.removeListener("stream-context", listener);
    },
  },

  onProfileChanged: (callback: (profileName: string) => void) => {
    ipcRenderer.on("obs-profile-changed", (_, profileName) => callback(profileName));
  },

  schedule: {
    get: () => ipcRenderer.invoke("schedule:get"),
    save: (items: ScheduleItem[]) => ipcRenderer.invoke("schedule:save", items),
    setStatus: (id: string, status: ScheduleItemStatus) =>
        ipcRenderer.invoke("schedule:setStatus", { id, status }),
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
    syncSchedule: () => ipcRenderer.invoke("google:syncSchedule"),
    testConnection: (sheetId: string, keyPath: string, tabName: string) =>
        ipcRenderer.invoke("google:testConnection", { sheetId, keyPath, tabName }),
  },

  autoStop: {
    start: () => ipcRenderer.invoke("autoStop:start"),
    stop: () => ipcRenderer.invoke("autoStop:stop"),
    setConfig: (config: AutoStopConfig) => ipcRenderer.invoke("autoStop:setConfig", config),
    getStatus: (): Promise<AutoStopStatus> => ipcRenderer.invoke("autoStop:getStatus"),
    selectReferenceImage: (): Promise<string | null> => ipcRenderer.invoke("autoStop:selectReferenceImage"),

    // ✅ PHASE 5A: runtime events (read-only UI)
    onRuntimeEvent: (callback: (evt: AutoStopRuntimeEvent) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, evt: AutoStopRuntimeEvent) => callback(evt);
      ipcRenderer.on("autostop-runtime", listener);
      return () => ipcRenderer.removeListener("autostop-runtime", listener);
    },
  },

  stopFrames: {
    listFilters: (): Promise<StopFrameFilter[]> => ipcRenderer.invoke("stopFrames:listFilters"),
    createFilter: (payload: StopFrameFilterCreatePayload): Promise<StopFrameFilter[]> =>
        ipcRenderer.invoke("stopFrames:createFilter", payload),
    updateFilter: (id: string, patch: StopFrameFilterPatch): Promise<StopFrameFilter[]> =>
        ipcRenderer.invoke("stopFrames:updateFilter", id, patch),
    deleteFilter: (id: string): Promise<StopFrameFilter[]> => ipcRenderer.invoke("stopFrames:deleteFilter", id),

    onChanged: (callback: (filters: StopFrameFilter[]) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, filters: StopFrameFilter[]) => callback(filters);
      ipcRenderer.on("stopframe-filters-changed", listener);
      return () => ipcRenderer.removeListener("stopframe-filters-changed", listener);
    },

    onNotification: (callback: (n: StopFrameNotification) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, n: StopFrameNotification) => callback(n);
      ipcRenderer.on("stopframe-filters-notification", listener);
      return () => ipcRenderer.removeListener("stopframe-filters-notification", listener);
    },

    openPreview: (absolutePath: string): Promise<string | null> => ipcRenderer.invoke("stopFrames:openPreview", absolutePath),
    selectImage: (): Promise<string | null> => ipcRenderer.invoke("stopFrames:selectImage"),
  },

  on: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.removeAllListeners(channel);
    ipcRenderer.on(channel, (_event, ...args) => listener(...args));
  },

  off: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, listener);
  },

  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  },

  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },
});
