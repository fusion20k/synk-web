const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Secure storage
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key)
  },
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // API requests to Express server
  apiRequest: (method, endpoint, body) => 
    ipcRenderer.invoke('api-request', { method, endpoint, body }),
  
  // Notifications
  showNotification: (title, body) => 
    ipcRenderer.invoke('show-notification', { title, body })
});