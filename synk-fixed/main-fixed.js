// Fixed Electron main process with proper OAuth handling
const path = require('path');
require('dotenv').config();

console.log('✅ Environment loaded');
console.log(`🔧 DEMO_MODE: ${process.env.DEMO_MODE || 'false'}`);

// Load Electron with proper error handling
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
  console.error('❌ Failed to load Electron:', error.message);
  console.error('This might be a module resolution issue. Try reinstalling Electron.');
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

// Start OAuth server
console.log('🚀 Starting OAuth server...');
const { startOAuthServer } = require('./src/oauth-server');

startOAuthServer().then(({ server, port }) => {
  console.log(`✅ OAuth server running on port ${port}`);
  oauthServerInstance = server;
  
  // Connect main window to OAuth server when available
  if (mainWindow) {
    server.setMainWindow(mainWindow);
    console.log('✅ Main window connected to OAuth server');
  }
}).catch(error => {
  console.error('❌ Failed to start OAuth server:', error);
});

function createWindow() {
  console.log('🪟 Creating main window...');
  
  // Convert favicon.jpg to .ico for Windows
  const iconPath = path.join(__dirname, 'favicon.ico');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Remove Windows default border
    titleBarStyle: 'hiddenInset', // Custom titlebar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'preload.js')
    },
    icon: iconPath, // Use favicon.ico for Windows taskbar
    show: false
  });

  // Hide menu bar
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

// IPC handlers for OAuth and app functionality
if (ipcMain) {
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

  // OAuth handlers
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

  ipcMain.handle('start-notion-oauth', async (event, options = {}) => {
    console.log('🔄 Starting Notion OAuth flow...');
    
    try {
      const demoMode = options?.demoMode || process.env.DEMO_MODE === 'true';
      const NOTION_CLIENT_ID = demoMode ? process.env.NOTION_CLIENT_ID_DEMO : process.env.NOTION_CLIENT_ID;
      const NOTION_REDIRECT_URI = demoMode ? process.env.NOTION_REDIRECT_URI_DEMO : process.env.NOTION_REDIRECT_URI;
      
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

  // Data fetching handlers
  ipcMain.handle('list-google-calendars', async () => {
    console.log('🔄 Fetching Google calendars...');
    
    try {
      if (oauthServerInstance) {
        const calendars = oauthServerInstance.getCalendars();
        if (calendars) {
          console.log(`✅ Returning ${calendars.items?.length || 0} calendars`);
          return calendars;
        }
      }
      
      console.log('⚠️ No calendars available - user needs to authenticate first');
      return { items: [] };
    } catch (error) {
      console.error('❌ Failed to get calendars:', error.message);
      throw error;
    }
  });

  ipcMain.handle('list-notion-databases', async () => {
    console.log('🔄 Fetching Notion databases...');
    // TODO: Implement Notion database fetching
    return { results: [] };
  });

  ipcMain.handle('get-google-user-info', async () => {
    console.log('🔄 Fetching Google user info...');
    // TODO: Implement Google user info fetching
    return { name: 'User', email: 'user@example.com' };
  });

  // Settings handlers
  ipcMain.handle('toggle-demo', async (event, enabled) => {
    console.log(`🔄 Toggling demo mode: ${enabled}`);
    process.env.DEMO_MODE = enabled ? 'true' : 'false';
    return { success: true, demoMode: enabled };
  });

  ipcMain.handle('clear-all-data', async () => {
    console.log('🔄 Clearing all data...');
    
    try {
      // Clear OAuth server data
      if (oauthServerInstance) {
        oauthServerInstance.tokens = null;
        oauthServerInstance.calendars = null;
      }
      
      // Send event to frontend to reset UI
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('connections-cleared');
      }
      
      console.log('✅ All data cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to clear data:', error.message);
      throw error;
    }
  });

  // Sync handlers (placeholder implementations)
  ipcMain.handle('sync-trigger', async (event, googleCalendarId, notionDatabaseId) => {
    console.log(`🔄 Triggering sync: ${googleCalendarId} -> ${notionDatabaseId}`);
    return { success: true, message: 'Sync triggered' };
  });

  ipcMain.handle('sync-status', async () => {
    return { status: 'idle', lastSync: null };
  });

  ipcMain.handle('sync-clear-data', async () => {
    console.log('🔄 Clearing sync data...');
    return { success: true };
  });

  ipcMain.handle('start-sync', async (event, options) => {
    console.log('🔄 Starting sync with options:', options);
    return { success: true, message: 'Sync started' };
  });

  // Utility handlers
  ipcMain.handle('open-external', async (event, url) => {
    console.log('🌐 Opening external URL:', url);
    await shell.openExternal(url);
    return { success: true };
  });

  ipcMain.handle('get-demo-mode', () => {
    return process.env.DEMO_MODE === 'true';
  });
}

console.log('✅ Fixed Electron main process loaded successfully');