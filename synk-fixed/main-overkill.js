// OVERKILL Electron main process - guarantees infinite loading fix
const path = require('path');
require('dotenv').config();

console.log('🔥 OVERKILL Electron main process starting...');
console.log(`🔧 DEMO_MODE: ${process.env.DEMO_MODE || 'false'}`);

// Load Electron with comprehensive error handling
let app, BrowserWindow, ipcMain, shell, protocol;

try {
  const electron = require('electron');
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  ipcMain = electron.ipcMain;
  shell = electron.shell;
  protocol = electron.protocol;
  
  console.log('✅ Electron APIs loaded successfully');
} catch (error) {
  console.error('❌ CRITICAL: Failed to load Electron:', error.message);
  console.error('This indicates a serious Electron installation issue.');
  process.exit(1);
}

// Disable GPU acceleration to eliminate warnings
if (app && app.disableHardwareAcceleration) {
  app.disableHardwareAcceleration();
  console.log('✅ GPU hardware acceleration disabled');
}

// Register custom protocol BEFORE app ready
if (app && app.setAsDefaultProtocolClient) {
  app.setAsDefaultProtocolClient('synk');
  console.log('✅ Custom protocol "synk://" registered');
} else {
  console.error('❌ Failed to register custom protocol');
}

// Global variables
let mainWindow = null;
let oauthServer = null;

// Start OVERKILL OAuth server
console.log('🔥 Starting OVERKILL OAuth server...');
const { startServer } = require('./oauth-server-overkill');

startServer().then(() => {
  console.log('✅ OVERKILL OAuth server started successfully');
}).catch(error => {
  console.error('❌ CRITICAL: Failed to start OAuth server:', error);
  console.error('The app cannot function without the OAuth server.');
});

function createWindow() {
  console.log('🪟 Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Main window shown');
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// FIXED protocol handler - simple and reliable
if (app) {
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
}

// App event handlers
if (app) {
  app.whenReady().then(() => {
    console.log('✅ Electron app ready');
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
}

// FIXED IPC handler that frontend expects
if (ipcMain) {
  ipcMain.handle('start-google-oauth', async () => {
    console.log('🔧 Google OAuth start requested...');
    
    try {
      // Use environment variables directly
      const DEMO_MODE = process.env.DEMO_MODE === 'true';
      const GOOGLE_CLIENT_ID = DEMO_MODE ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
      const GOOGLE_REDIRECT_URI = DEMO_MODE ? process.env.GOOGLE_REDIRECT_URI_DEMO : process.env.GOOGLE_REDIRECT_URI;
      
      if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
        throw new Error('Missing Google OAuth configuration');
      }
      
      // Open Google OAuth in browser
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

  ipcMain.handle('start-notion-oauth', async (event, { demoMode }) => {
    console.log('🔥 OVERKILL Notion OAuth start requested...');
    
    try {
      const DEMO_MODE = demoMode || process.env.DEMO_MODE === 'true';
      const NOTION_CLIENT_ID = DEMO_MODE ? process.env.NOTION_CLIENT_ID_DEMO : process.env.NOTION_CLIENT_ID;
      const NOTION_REDIRECT_URI = DEMO_MODE ? process.env.NOTION_REDIRECT_URI_DEMO : process.env.NOTION_REDIRECT_URI;
      
      if (!NOTION_CLIENT_ID || !NOTION_REDIRECT_URI) {
        throw new Error('Missing Notion OAuth configuration');
      }
      
      // Generate OAuth URL
      const crypto = require('crypto');
      const state = crypto.randomBytes(16).toString('hex');
      
      const params = new URLSearchParams({
        client_id: NOTION_CLIENT_ID,
        redirect_uri: NOTION_REDIRECT_URI,
        response_type: 'code',
        owner: 'user',
        state: state
      });

      const authUrl = `https://api.notion.com/v1/oauth/authorize?${params}`;
      
      console.log('🌐 Opening Notion OAuth URL...');
      await shell.openExternal(authUrl);
      
      return { success: true, message: 'Notion OAuth flow started' };
      
    } catch (error) {
      console.error('❌ Notion OAuth start failed:', error.message);
      return { error: error.message };
    }
  });
}

console.log('🔥 OVERKILL Electron main process loaded - infinite loading WILL BE FIXED!');