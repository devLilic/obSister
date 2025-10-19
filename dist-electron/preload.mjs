"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  },
  obsProfiles: {
    getAll: () => electron.ipcRenderer.invoke("obs:getProfiles"),
    set: (name) => electron.ipcRenderer.invoke("obs:setProfile", name)
  },
  // You can expose other APTs you need here.
  onOBSStatus: (callback) => {
    electron.ipcRenderer.on("obs-status", (_, status) => callback(status));
  },
  startStream: (key) => electron.ipcRenderer.send("start-stream", key),
  stopStream: () => electron.ipcRenderer.send("stop-stream")
});
