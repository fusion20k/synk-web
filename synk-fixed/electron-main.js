const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const log = require('electron-log');

// Load environment variables
require('dotenv').config();

const store = new Store();
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'preload.js')
    },
    backgroundColor: '#000000',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('connect-google', async () => {
  try {
    const { googleOAuth } = require('./src/oauth');
    const result = await googleOAuth(shell);
    return result;
  } catch (error) {
    log.error('Google OAuth error:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('connect-notion', async () => {
  try {
    const { notionOAuth } = require('./src/oauth');
    const result = await notionOAuth(shell);
    return result;
  } catch (error) {
    log.error('Notion OAuth error:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('list-google-calendars', async () => {
  try {
    const { listGoogleCalendars } = require('./src/google');
    return await listGoogleCalendars();
  } catch (error) {
    log.error('List calendars error:', error);
    return [];
  }
});

ipcMain.handle('list-notion-databases', async () => {
  try {
    const { listDatabases } = require('./src/notion');
    return await listDatabases();
  } catch (error) {
    log.error('List databases error:', error);
    return [];
  }
});

ipcMain.handle('get-google-user-info', async () => {
  try {
    const { getGoogleUserInfo } = require('./src/google');
    return await getGoogleUserInfo();
  } catch (error) {
    log.error('Get user info error:', error);
    return null;
  }
});

// Window controls
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Demo mode toggle
ipcMain.handle('toggle-demo', async (event, enabled) => {
  log.info('Demo mode toggled:', enabled);
  return { ok: true, demoMode: enabled };
});

console.log('Synk app initialized successfully');