// Production-only Electron main process
const path = require('path');
const Store = require('electron-store');
require('dotenv').config();

console.log('🚀 Starting Synk in Production Mode...');

// Import Electron with error handling
let app, BrowserWindow, ipcMain, shell;

try {
  const electron = require('electron');
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  ipcMain = electron.ipcMain;
  shell = electron.shell;
  console.log('✅ Electron APIs loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Electron:', error.message);
  process.exit(1);
}

const store = new Store();
let mainWindow = null;

function createWindow() {
  console.log('🪟 Creating main window...');
  
  const iconPath = path.join(__dirname, 'favicon.jpg');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    show: false,
    autoHideMenuBar: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: iconPath
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Window shown');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (
    process.env.NODE_ENV === 'development' &&
    (process.env.DEBUG_PROD === 'true' || process.env.OPEN_DEVTOOLS === 'true')
  ) {
    mainWindow.webContents.openDevTools({ mode: 'right' });
  }
}

// Register IPC handlers
function registerIpcHandlers() {
  // Production OAuth handlers
  ipcMain.handle('start-google-oauth', async (event, options = {}) => {
    console.log('[OAuth] Google OAuth requested (Production mode)');
    
    try {
      const { googleOAuthViaProduction } = require('./src/oauth');
      console.log('[OAuth] Starting production Google OAuth...');
      
      const result = await googleOAuthViaProduction(shell);
      console.log('[OAuth] Google OAuth result:', result);
      
      if (result.ok) {
        console.log(`[OAuth] SUCCESS: ${result.calendars.length} calendars fetched`);
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('google-oauth-success', result.calendars);
        }
        return { 
          success: true, 
          calendars: result.calendars
        };
      } else {
        console.error('[OAuth] Google OAuth failed:', result.error);
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('google-oauth-failed', result.error || 'unknown');
        }
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[OAuth] Google OAuth error:', error);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('google-oauth-failed', error.message);
      }
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('start-notion-oauth', async (event, options = {}) => {
    console.log('[OAuth] Notion OAuth requested (Production mode)');
    
    try {
      const { notionOAuthViaProduction } = require('./src/oauth');
      console.log('[OAuth] Starting production Notion OAuth...');
      
      const result = await notionOAuthViaProduction(shell);
      console.log('[OAuth] Notion OAuth result:', result);
      
      if (result.ok) {
        console.log(`[OAuth] SUCCESS: Notion workspace connected`);
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('notion-oauth-success', result.workspace);
        }
        return { 
          success: true, 
          workspace: result.workspace,
          databases: result.databases
        };
      } else {
        console.error('[OAuth] Notion OAuth failed:', result.error);
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('notion-oauth-failed', result.error || 'unknown');
        }
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[OAuth] Notion OAuth error:', error);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('notion-oauth-failed', error.message);
      }
      return { success: false, error: error.message };
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

  // Store handlers
  ipcMain.handle('store-get', (event, key) => {
    return store.get(key);
  });

  ipcMain.handle('store-set', (event, key, value) => {
    store.set(key, value);
  });

  ipcMain.handle('store-delete', (event, key) => {
    store.delete(key);
  });

  console.log('✅ IPC handlers registered (Production mode only)');
}

// App events
if (app) {
  app.whenReady().then(() => {
    console.log('✅ App ready');
    
    // Register IPC handlers AFTER app is ready
    registerIpcHandlers();
    
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
} else {
  console.error('❌ App is undefined - Electron not loaded properly');
  process.exit(1);
}

console.log('✅ Electron main process initialized (Production mode only)');