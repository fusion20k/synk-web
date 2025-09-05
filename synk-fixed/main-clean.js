// Synk - Production Mode Only (Clean Version)
const path = require('path');
require('dotenv').config();

console.log('🚀 Starting Synk in Production Mode...');

// Import Electron with error handling
let app, BrowserWindow, ipcMain, shell, nativeImage;

try {
  const electron = require('electron');
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  ipcMain = electron.ipcMain;
  shell = electron.shell;
  nativeImage = electron.nativeImage;
  console.log('✅ Electron APIs loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Electron:', error.message);
  process.exit(1);
}

let mainWindow = null;

// Production mode - no local OAuth server needed
console.log('✅ Production mode - using remote OAuth endpoints only');

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'favicon.ico'); // adjust if needed
  const iconImage = nativeImage.createFromPath(iconPath);

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    autoHideMenuBar: true,
    icon: iconImage,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.DEBUG === 'true') {
    // debug only when explicitly set
    win.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow = win;

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Window shown');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // DevTools disabled for clean production experience
  // mainWindow.webContents.openDevTools();
}

// Register IPC handlers function
function registerIpcHandlers() {
  console.log('🔧 Registering IPC handlers...');

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

  ipcMain.handle('window-close', async () => {
    const wins = BrowserWindow.getAllWindows();
    if (wins[0]) wins[0].close();
    return true;
  });

  ipcMain.handle('get-demo-mode', async () => {
    // demo mode permanently removed, always return false
    return false;
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
  process.exit(1);
}

console.log('🔧 Main process loaded - IPC handler should be working!');