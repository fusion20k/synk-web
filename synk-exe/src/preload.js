const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // API requests
  apiRequest: (method, endpoint, body) => ipcRenderer.invoke('api-request', { method, endpoint, body }),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Sync operations
  getSyncLog: () => ipcRenderer.invoke('get-sync-log'),
  forceSync: () => ipcRenderer.invoke('force-sync'),
  toggleSync: () => ipcRenderer.invoke('toggle-sync'),
  
  // Connections
  connectNotion: (dbId) => ipcRenderer.invoke('connect-notion', dbId),
  connectGoogle: () => ipcRenderer.invoke('connect-google'),
  
  // Event listeners
  onConnectionsUpdated: (callback) => ipcRenderer.on('connections-updated', callback),
  onLogUpdated: (callback) => ipcRenderer.on('log-updated', callback),
  onSyncStatusChanged: (callback) => ipcRenderer.on('sync-status-changed', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});