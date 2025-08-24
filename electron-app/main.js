const { app, BrowserWindow, Menu, Tray, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize secure storage
const store = new Store({
  encryptionKey: 'synk-secure-key-2024'
});

let mainWindow;
let tray;
let isQuitting = false;

// API Base URL (pointing to your Express server)
const API_BASE = 'http://localhost:3000';

function createWindow() {
  // Create the browser window with neon theme
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'temp-icon.ico'),
    titleBarStyle: 'default',
    backgroundColor: '#000000',
    show: false,
    frame: true
  });

  // Load the main UI
  mainWindow.loadFile('renderer/index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window close - minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Create system tray icon
  const trayIconPath = path.join(__dirname, 'assets', 'temp-icon.ico');
  tray = new Tray(trayIconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Synk',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: 'Sync Now',
      click: async () => {
        try {
          const response = await fetch(`${API_BASE}/sync/trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            tray.displayBalloon({
              title: 'Synk',
              content: 'Manual sync triggered successfully!'
            });
          }
        } catch (error) {
          tray.displayBalloon({
            title: 'Synk Error',
            content: 'Failed to trigger sync. Is the server running?'
          });
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Synk - Notion ↔ Google Calendar Sync');
  tray.setContextMenu(contextMenu);

  // Double-click to open
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Keep app running in background on Windows/Linux
  if (process.platform !== 'darwin') {
    // Don't quit, just hide to tray
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// IPC handlers for renderer communication
ipcMain.handle('store-get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('store-delete', (event, key) => {
  store.delete(key);
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('api-request', async (event, { method, endpoint, body }) => {
  try {
    const { net } = require('electron');
    const url = `${API_BASE}${endpoint}`;
    
    const request = net.request({
      method,
      url,
      headers: { 'Content-Type': 'application/json' }
    });
    
    return new Promise((resolve) => {
      let responseData = '';
      
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk;
        });
        
        response.on('end', () => {
          try {
            const data = JSON.parse(responseData);
            resolve({
              ok: response.statusCode >= 200 && response.statusCode < 300,
              status: response.statusCode,
              data
            });
          } catch (parseError) {
            resolve({
              ok: false,
              status: response.statusCode,
              data: { error: 'Failed to parse response' }
            });
          }
        });
      });
      
      request.on('error', (error) => {
        resolve({
          ok: false,
          status: 0,
          data: { error: error.message }
        });
      });
      
      if (body) {
        request.write(JSON.stringify(body));
      }
      
      request.end();
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { error: error.message }
    };
  }
});

// Show notification
ipcMain.handle('show-notification', (event, { title, body }) => {
  if (tray) {
    tray.displayBalloon({ title, content: body });
  }
});