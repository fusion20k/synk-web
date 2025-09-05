// Production-only Electron main process
const path = require('path');
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

let mainWindow = null;

// Production mode - no local OAuth server needed
console.log('✅ Production mode - using remote OAuth endpoints only');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'preload.js')
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Window shown');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools to see any errors
  mainWindow.webContents.openDevTools();
}

// Register IPC handlers function
function registerIpcHandlers() {
  console.log('🔧 Registering IPC handlers...');

  if (!ipcMain) {
    console.error('❌ ipcMain is undefined - Electron not loaded properly');
    return;
  }

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

  console.log('✅ IPC handler registered: start-google-oauth');
}

// Register custom protocol (will be called after app ready)
if (app) {
  app.setAsDefaultProtocolClient('synk');
}

// App events
if (app) {
  // Protocol handler
  app.on('open-url', (event, url) => {
    event.preventDefault();
    console.log('🔧 Protocol handler received URL:', url);
    
    if (url.startsWith('synk://oauth-success')) {
      try {
        const data = JSON.parse(decodeURIComponent(new URL(url).searchParams.get('data')));
        console.log('✅ OAuth success - sending to frontend');
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('oauth-success', data);
        }
      } catch (error) {
        console.error('❌ Failed to parse success data:', error.message);
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('oauth-failed', 'Failed to parse data');
        }
      }
    } else if (url.startsWith('synk://oauth-failed')) {
      console.log('❌ OAuth failed - sending to frontend');
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('oauth-failed', 'OAuth failed');
      }
    }
  });

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
}

console.log('🔧 Main process loaded - IPC handler should be working!');