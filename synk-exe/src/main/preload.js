// src/main/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  connectNotion: (payload) => ipcRenderer.invoke('notion:connect', payload),
  listNotionDatabases: () => ipcRenderer.invoke('notion:listDatabases'),
  syncNow: () => ipcRenderer.invoke('sync:now'),
  onUiSyncNow: (handler) => ipcRenderer.on('ui:sync-now', handler)
});