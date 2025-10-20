"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  // -----------------------------
  // ✅ OBS Connection Status
  // -----------------------------
  onOBSStatus: (callback) => {
    electron.ipcRenderer.on("obs-status", (_, status) => callback(status));
  },
  // -----------------------------
  // ✅ OBS Profile Management
  // -----------------------------
  obsProfiles: {
    getAll: () => electron.ipcRenderer.invoke("obs:getProfiles"),
    set: (name) => electron.ipcRenderer.invoke("obs:setProfile", name)
  },
  // -----------------------------
  // ✅ Streaming Control
  // -----------------------------
  stream: {
    start: (key) => electron.ipcRenderer.send("start-stream", key),
    stop: () => electron.ipcRenderer.send("stop-stream"),
    startSmart: (key, mode) => electron.ipcRenderer.invoke("obs:startSmartStream", { key, mode })
  },
  // -----------------------------
  // ✅ OBS Profile Change Events
  // -----------------------------
  onProfileChanged: (callback) => {
    electron.ipcRenderer.on("obs-profile-changed", (_, profileName) => callback(profileName));
  },
  // -----------------------------
  // ⚙️ Generic Helpers
  // -----------------------------
  on: (channel, listener) => {
    electron.ipcRenderer.removeAllListeners(channel);
    electron.ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  off: (channel, listener) => electron.ipcRenderer.removeListener(channel, listener),
  send: (channel, ...args) => electron.ipcRenderer.send(channel, ...args),
  invoke: (channel, ...args) => electron.ipcRenderer.invoke(channel, ...args),
  schedule: {
    get: () => electron.ipcRenderer.invoke("schedule:get"),
    save: (list) => electron.ipcRenderer.invoke("schedule:save", list)
  },
  config: {
    get: () => electron.ipcRenderer.invoke("config:get"),
    save: (data) => electron.ipcRenderer.invoke("config:save", data)
  },
  logs: {
    load: () => electron.ipcRenderer.invoke("logs:load"),
    clear: () => electron.ipcRenderer.invoke("logs:clear")
  }
});
