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

  // Notion OAuth handler (production only)
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
          workspace: result.workspace
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

  // Window control handlers
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

  // External link handler
  ipcMain.handle('open-external', async (event, url) => {
    if (shell) {
      await shell.openExternal(url);
    }
  });

  // Calendar and database handlers
  ipcMain.handle('list-google-calendars', async () => {
    console.log('[Data] Fetching Google calendars...');
    try {
      const { getGoogleCalendars } = require('./src/oauth');
      const calendars = await getGoogleCalendars();
      return { success: true, calendars };
    } catch (error) {
      console.error('[Data] Failed to fetch calendars:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('list-notion-databases', async () => {
    console.log('[Data] Fetching Notion databases...');
    try {
      const { getNotionDatabases } = require('./src/oauth');
      const databases = await getNotionDatabases();
      return { success: true, databases };
    } catch (error) {
      console.error('[Data] Failed to fetch databases:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-google-user-info', async () => {
    console.log('[Data] Fetching Google user info...');
    try {
      const { getGoogleUserInfo } = require('./src/oauth');
      const userInfo = await getGoogleUserInfo();
      return { success: true, userInfo };
    } catch (error) {
      console.error('[Data] Failed to fetch user info:', error);
      return { success: false, error: error.message };
    }
  });

  // Data clearing handler
  ipcMain.handle('clear-all-data', async () => {
    console.log('[Settings] Clearing all data...');
    // Clear stored tokens and reset state
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('connections-cleared');
    }
    return { success: true };
  });

  console.log('✅ IPC handlers registered: OAuth, window controls, and utilities');
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