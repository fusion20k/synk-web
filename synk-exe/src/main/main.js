// src/main/main.js
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');

let mainWindow = null;
let tray = null;

function resolveRendererHtml() {
  // Works in dev and in asar-packed dist
  return path.join(__dirname, '..', 'renderer', 'index.html');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 680,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#000000',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.on('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.loadFile(resolveRendererHtml()).catch(err => {
    log.error('Failed to load index.html:', err);
  });
}

function createTray() {
  try {
    const iconPath = path.join(app.isPackaged ? process.resourcesPath : process.cwd(), 'assets', 'tray.png');
    let image;
    
    try {
      image = nativeImage.createFromPath(iconPath);
      if (image.isEmpty()) {
        // Fallback to a simple template image
        image = nativeImage.createEmpty();
      }
    } catch (iconError) {
      log.warn('Tray icon not found, using empty image:', iconError);
      image = nativeImage.createEmpty();
    }
    
    tray = new Tray(image);
    tray.setToolTip('Synk');
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open Synk', click: () => { if (!mainWindow) createWindow(); else mainWindow.show(); } },
      { label: 'Sync Now', click: () => { if (mainWindow) mainWindow.webContents.send('ui:sync-now'); } },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('click', () => { if (!mainWindow) createWindow(); else mainWindow.show(); });
  } catch (e) {
    log.error('Tray creation failed:', e);
  }
}

// App initialization
app.whenReady().then(() => {
  // Single instance lock
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.setAppUserModelId('com.synk.app');
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // Keep app running in tray on Windows
  if (process.platform !== 'darwin') {
    // do not quit
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC hooks
ipcMain.handle('notion:listDatabases', async (_evt) => {
  const { listDatabases } = require('./notion');
  return listDatabases();
});

ipcMain.handle('notion:connect', async (_evt, tokenOrOAuthPayload) => {
  const { connectNotion } = require('./notion');
  return connectNotion(tokenOrOAuthPayload);
});

ipcMain.handle('sync:now', async () => {
  // Stub: wire to your existing sync logic module
  try {
    const { syncNow } = require('./google'); // implement later
    const result = await syncNow();
    return { ok: true, result };
  } catch (e) {
    log.error('Sync failed:', e);
    return { ok: false, error: String(e) };
  }
});