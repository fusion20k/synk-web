// Working Electron main with OAuth debugging
const path = require('path');
require('dotenv').config();

console.log('[Main] Starting Electron app...');

// Try to load Electron with error handling
let app, BrowserWindow, ipcMain, shell;
try {
  const electron = require('electron');
  ({ app, BrowserWindow, ipcMain, shell } = electron);
  console.log('[Main] ✅ Electron modules loaded successfully');
} catch (error) {
  console.error('[Main] ❌ Failed to load Electron:', error.message);
  process.exit(1);
}

// Start OAuth server first
console.log('[Main] 🚀 Starting OAuth server...');
const { startOAuthServer } = require('./src/oauth-server');
let oauthServerInstance = null;

startOAuthServer().then(({ server, port }) => {
  console.log(`[Main] ✅ OAuth server running on port ${port}`);
  oauthServerInstance = server;
}).catch(error => {
  console.error('[Main] ❌ Failed to start OAuth server:', error);
});

let mainWindow;

function createWindow() {
  console.log('[Main] 🪟 Creating main window...');
  
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
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Connect OAuth server to main window
  if (oauthServerInstance) {
    oauthServerInstance.setMainWindow(mainWindow);
    console.log('[Main] ✅ OAuth server connected to main window');
  }

  mainWindow.once('ready-to-show', () => {
    console.log('[Main] 🎯 Window ready, showing...');
    mainWindow.show();
    
    // Open DevTools to see console output
    mainWindow.webContents.openDevTools({ mode: 'right' });
  });

  // Debug: Log when calendars are sent via IPC
  mainWindow.webContents.on('ipc-message', (event, channel, ...args) => {
    if (channel === 'google:calendars') {
      console.log('[Main] 📤 Sending google:calendars event to renderer');
      console.log('[Main] Calendar data:', args[0]?.items?.length, 'calendars');
    }
  });
}

// IPC Handlers
ipcMain.handle('start-google-oauth', async (event, options = {}) => {
  console.log('[Main] 🔧 start-google-oauth handler called');
  console.log('[Main] Options:', options);
  
  try {
    const DEMO_MODE = process.env.DEMO_MODE === 'true';
    const GOOGLE_CLIENT_ID = DEMO_MODE ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_REDIRECT_URI = DEMO_MODE ? process.env.GOOGLE_REDIRECT_URI_DEMO : process.env.GOOGLE_REDIRECT_URI;
    
    console.log('[Main] Using config:', {
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
    
    console.log('[Main] 🌐 Opening OAuth URL...');
    await shell.openExternal(authUrl);
    
    console.log('[Main] ✅ OAuth URL opened - waiting for callback...');
    return { success: true, message: 'OAuth flow started' };
    
  } catch (error) {
    console.error('[Main] ❌ OAuth start failed:', error.message);
    return { success: false, error: error.message };
  }
});

// App event handlers
if (app) {
  app.whenReady().then(() => {
    console.log('[Main] 🚀 App ready, creating window...');
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

  // Protocol handler for custom protocol
  app.setAsDefaultProtocolClient('synk');
  
  app.on('open-url', (event, url) => {
    event.preventDefault();
    console.log('[Main] 🔗 Protocol handler received URL:', url);
    
    if (url.startsWith('synk://oauth-success')) {
      console.log('[Main] ✅ OAuth success protocol received');
      // Extract calendar data from URL
      const urlObj = new URL(url);
      const data = urlObj.searchParams.get('data');
      if (data && mainWindow) {
        try {
          const calendars = JSON.parse(decodeURIComponent(data));
          console.log('[Main] 📤 Sending calendars via protocol handler:', calendars.items?.length);
          mainWindow.webContents.send('google:calendars', calendars);
        } catch (error) {
          console.error('[Main] ❌ Failed to parse calendar data from protocol:', error);
        }
      }
    }
  });
} else {
  console.error('[Main] ❌ App is undefined - Electron not loaded properly');
  process.exit(1);
}

console.log('[Main] 📋 Main process setup complete');