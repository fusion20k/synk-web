const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // OAuth connections (FIXED version)
  startGoogleOAuth: () => ipcRenderer.invoke('start-google-oauth'),
  startNotionOAuth: (options) => ipcRenderer.invoke('start-notion-oauth', options),

  // Data fetching
  getCalendars: () => ipcRenderer.invoke('list-google-calendars'),
  getDatabases: () => ipcRenderer.invoke('list-notion-databases'),
  getUserInfo: () => ipcRenderer.invoke('get-google-user-info'),

  // Settings
  toggleDemo: (enabled) => ipcRenderer.invoke('toggle-demo', enabled),
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),

  // Sync management
  triggerSync: (googleCalendarId, notionDatabaseId) => ipcRenderer.invoke('sync-trigger', googleCalendarId, notionDatabaseId),
  getSyncStatus: () => ipcRenderer.invoke('sync-status'),
  clearSyncData: () => ipcRenderer.invoke('sync-clear-data'),
  startSync: (options) => ipcRenderer.invoke('start-sync', options),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Event listeners for OAuth and demo
  onOAuthSuccess: (callback) => ipcRenderer.on('oauth-success', callback),
  onOAuthFailed: (callback) => ipcRenderer.on('oauth-failed', callback),
  onGoogleCalendars: (callback) => ipcRenderer.on('google:calendars', callback),
  onDemoTimeout: (callback) => ipcRenderer.on('demo-timeout', callback),
  onConnectionsCleared: (callback) => ipcRenderer.on('connections-cleared', callback),
  onConnectionError: (callback) => ipcRenderer.on('connection-error', callback),

  // Environment detection
  isDemoMode: () => ipcRenderer.invoke('get-demo-mode'),

  // Logging (for debugging)
  log: (message) => console.log('[Renderer]', message)
});