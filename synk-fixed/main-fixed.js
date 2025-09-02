// Fixed Electron main process with proper OAuth handling
const path = require('path');
require('dotenv').config();

console.log('✅ Environment loaded');
console.log(`🔧 DEMO_MODE: ${process.env.DEMO_MODE || 'false'}`);

// Load Electron with proper error handling using electron-fix
let app, BrowserWindow, ipcMain, shell, protocol;

try {
  const loadElectronFix = require('./electron-fix');
  const electron = loadElectronFix();
  
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  ipcMain = electron.ipcMain;
  shell = electron.shell;
  protocol = electron.protocol;
  
  console.log('✅ Electron APIs loaded successfully');
  console.log('🔍 app object after loading:', !!app);
  console.log('🔍 BrowserWindow object after loading:', !!BrowserWindow);
} catch (error) {
  console.error('❌ Failed to load Electron:', error.message);
  process.exit(1);
}

// Disable GPU acceleration to fix GPU warning
if (app && app.disableHardwareAcceleration) {
  app.disableHardwareAcceleration();
  console.log('✅ GPU hardware acceleration disabled');
}

// Set up custom protocol for OAuth callbacks
if (app && app.setAsDefaultProtocolClient) {
  app.setAsDefaultProtocolClient('synk');
  console.log('✅ Custom protocol "synk://" registered');
}

// Global variables
let mainWindow = null;
let oauthServerInstance = null;

// Start OAuth server (temporarily commented out for debugging)
console.log('🚀 OAuth server startup temporarily disabled for debugging...');
// const { startOAuthServer } = require('./src/oauth-server');

// startOAuthServer().then(({ server, port }) => {
//   console.log(`✅ OAuth server running on port ${port}`);
//   oauthServerInstance = server;
//   
//   // Connect main window to OAuth server when available
//   if (mainWindow) {
//     server.setMainWindow(mainWindow);
//     console.log('✅ Main window connected to OAuth server');
//   }
// }).catch(error => {
//   console.error('❌ Failed to start OAuth server:', error);
// });

function createWindow() {
  console.log('🪟 Creating main window...');
  console.log("Created window in:", __filename);
  
  const iconPath = path.join(__dirname, 'favicon.ico'); // keep within synk-fixed

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,                 // <<< MUST be false to remove OS border
    show: false,                  // show after ready-to-show
    autoHideMenuBar: true,        // hide menu bar (toggle with Alt if needed)
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: iconPath
  });

  // hide menu always (extra safety)
  mainWindow.setMenuBarVisibility(false);

  // Load the app
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Main window shown');
    
    // Connect OAuth server to this window
    if (oauthServerInstance) {
      oauthServerInstance.setMainWindow(mainWindow);
      console.log('✅ OAuth server connected to main window');
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle custom protocol URLs (synk://oauth-success)
if (app) {
  app.on('open-url', (event, url) => {
    event.preventDefault();
    console.log('📥 Custom protocol URL received:', url);
    
    try {
      const urlObj = new URL(url);
      
      if (urlObj.protocol === 'synk:' && urlObj.hostname === 'oauth-success') {
        const dataParam = urlObj.searchParams.get('data');
        
        if (dataParam && mainWindow) {
          const calendars = JSON.parse(decodeURIComponent(dataParam));
          console.log('📤 Sending OAuth success to frontend');
          mainWindow.webContents.send('oauth-success', calendars);
          console.log('✅ OAuth success sent to frontend');
        }
      } else if (urlObj.protocol === 'synk:' && urlObj.hostname === 'oauth-failed') {
        const error = urlObj.searchParams.get('error') || 'OAuth failed';
        console.log('📤 Sending OAuth failure to frontend');
        mainWindow.webContents.send('oauth-failed', error);
        console.log('✅ OAuth failure sent to frontend');
      }
    } catch (error) {
      console.error('❌ Failed to parse custom protocol URL:', error.message);
    }
  });
}

console.log('🔍 About to set up app event handlers...');
console.log('🔍 app object exists:', !!app);

// App event handlers
if (app) {
  console.log('🚀 Setting up app.whenReady() handler...');
  app.whenReady().then(() => {
    console.log('✅ Electron app ready');
    console.log('🪟 About to call createWindow()...');
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

// IPC handlers for OAuth
if (ipcMain) {
  ipcMain.handle('start-google-oauth', async (event, options = {}) => {
    console.log('🔄 Starting Google OAuth flow...');
    
    try {
      const DEMO_MODE = options.demoMode || process.env.DEMO_MODE === 'true';
      const GOOGLE_CLIENT_ID = DEMO_MODE ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
      const GOOGLE_REDIRECT_URI = DEMO_MODE ? process.env.GOOGLE_REDIRECT_URI_DEMO : process.env.GOOGLE_REDIRECT_URI;
      
      if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
        throw new Error('Missing Google OAuth configuration');
      }
      
      // Generate OAuth URL
      const crypto = require('crypto');
      const state = crypto.randomBytes(16).toString('hex');
      
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: process.env.GOOGLE_SCOPES || 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar',
        access_type: 'offline',
        prompt: 'consent',
        state: state
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      
      console.log('🌐 Opening OAuth URL:', authUrl);
      await shell.openExternal(authUrl);
      
      return { success: true, message: 'OAuth flow started' };
      
    } catch (error) {
      console.error('❌ OAuth start failed:', error.message);
      return { error: error.message };
    }
  });

  ipcMain.handle('start-notion-oauth', async (event, { demoMode }) => {
    console.log('🔄 Starting Notion OAuth flow...');
    
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
      
      console.log('🌐 Opening Notion OAuth URL:', authUrl);
      await shell.openExternal(authUrl);
      
      return { success: true, message: 'Notion OAuth flow started' };
      
    } catch (error) {
      console.error('❌ Notion OAuth start failed:', error.message);
      return { error: error.message };
    }
  });
}

console.log('✅ Fixed Electron main process loaded successfully');