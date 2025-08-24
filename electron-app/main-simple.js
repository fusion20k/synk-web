const { app, BrowserWindow, Menu, Tray, ipcMain, shell } = require('electron');
const path = require('path');

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
        console.log('Manual sync triggered from tray');
        // TODO: Implement sync trigger
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

// Simple IPC handlers
ipcMain.handle('api-request', async (event, { method, endpoint, body }) => {
  console.log(`API Request: ${method} ${endpoint}`);
  return { ok: true, status: 200, data: { message: 'Mock response' } };
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('show-notification', (event, { title, body }) => {
  console.log(`Notification: ${title} - ${body}`);
});