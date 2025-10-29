// Simple working dev main file
const path = require('path');
require('dotenv').config();

console.log('🔧 Simple dev main starting...');
console.log(`📋 MODE: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 DEMO_MODE: ${process.env.DEMO_MODE || 'false'}`);

// Load Electron APIs
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

// Disable GPU acceleration
if (app && app.disableHardwareAcceleration) {
  app.disableHardwareAcceleration();
  console.log('✅ GPU acceleration disabled');
}

let mainWindow = null;

// Start OAuth server
const { startServer } = require('../oauth-server-overkill');
startServer().then(() => {
  console.log('✅ OAuth server started');
}).catch(error => {
  console.error('❌ OAuth server failed:', error);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Window shown');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in dev mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// IPC handlers will be registered in app.whenReady()
function registerIpcHandlers() {
  console.log('🔧 Registering IPC handlers...');

  if (ipcMain) {
    ipcMain.handle('start-google-oauth', async (event, options = {}) => {
      console.log('🔧 start-google-oauth handler called!');
      
      try {
        const DEMO_MODE = process.env.DEMO_MODE === 'true';
        const GOOGLE_CLIENT_ID = DEMO_MODE ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
        const GOOGLE_REDIRECT_URI = DEMO_MODE ? process.env.GOOGLE_REDIRECT_URI_DEMO : process.env.GOOGLE_REDIRECT_URI;
        
        console.log('🔧 Using config:', {
          DEMO_MODE,
          CLIENT_ID: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 10)}...` : 'MISSING',
          REDIRECT_URI: GOOGLE_REDIRECT_URI
        });
        
        if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
          throw new Error('Missing Google OAuth configuration');
        }
        
        const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
          new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: GOOGLE_REDIRECT_URI,
            response_type: 'code',
            scope: process.env.GOOGLE_SCOPES || 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar',
            access_type: 'offline',
            prompt: 'consent',
          }).toString();
        
        console.log('🌐 Opening OAuth URL...');
        await shell.openExternal(authUrl);
        
        console.log('✅ OAuth URL opened successfully');
        return { status: 'started' };
        
      } catch (error) {
        console.error('❌ OAuth start failed:', error.message);
        throw error;
      }
    });

    ipcMain.handle('start-notion-oauth', async (event, options = {}) => {
      console.log('🔧 start-notion-oauth handler called!');
      // Add Notion OAuth logic here if needed
      return { status: 'started' };
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

    ipcMain.handle('window-is-maximized', () => {
      return mainWindow ? mainWindow.isMaximized() : false;
    });

    console.log('✅ IPC handlers registered');
  } else {
    console.error('❌ ipcMain is undefined - IPC handlers not registered');
  }
}

// Register custom protocol
if (app && app.setAsDefaultProtocolClient) {
  app.setAsDefaultProtocolClient('synk');
  console.log('✅ Protocol registered');
}

// App events (only if app is available)
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
    
    // Register IPC handlers after app is ready
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

console.log('🔧 Simple dev main loaded - IPC handlers ready!');