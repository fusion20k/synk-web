// Synk - Production Mode Only (Clean Version)
const path = require('path');
require('dotenv').config();

console.log('🚀 Starting Synk in Production Mode...');

// Import Electron with error handling
let app, BrowserWindow, ipcMain, shell, nativeImage;

try {
  const electron = require('electron');
  console.log('✅ Electron object:', typeof electron);
  console.log('✅ Electron.app:', typeof electron.app);
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  ipcMain = electron.ipcMain;
  shell = electron.shell;
  nativeImage = electron.nativeImage;
  console.log('✅ Electron APIs loaded successfully');
  console.log('✅ App variable set:', app ? 'YES' : 'NO');
} catch (error) {
  console.error('❌ Failed to load Electron:', error.message);
  process.exit(1);
}

let mainWindow = null;

// Production mode - no local OAuth server needed
console.log('✅ Production mode - using remote OAuth endpoints only');

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'favicon.jpg');
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
        console.log(`[OAuth] SUCCESS: ${result.calendars.allCalendars?.length || 0} calendars fetched`);
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
        console.log(`[OAuth] SUCCESS: Notion connected successfully`);
        console.log(`[OAuth] 📤 Sending notion-oauth-success event to frontend...`);
        console.log(`[OAuth] 📤 Event data:`, result);
        if (mainWindow && mainWindow.webContents) {
          // Add a small delay to ensure frontend is ready
          setTimeout(() => {
            mainWindow.webContents.send('notion-oauth-success', result);
            console.log(`[OAuth] ✅ Event sent successfully (with delay)`);
          }, 100);
        } else {
          console.log(`[OAuth] ❌ Cannot send event - mainWindow or webContents not available`);
        }
        return { 
          success: true, 
          data: result
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

  ipcMain.handle('window-close', async () => {
    const wins = BrowserWindow.getAllWindows();
    if (wins[0]) wins[0].close();
    return true;
  });

  ipcMain.handle('get-demo-mode', async () => {
    // demo mode permanently removed, always return false
    return false;
  });

  // Add missing IPC handlers for data fetching
  ipcMain.handle('list-google-calendars', async () => {
    try {
      const { listGoogleCalendars } = require('./src/google');
      return await listGoogleCalendars();
    } catch (error) {
      console.error('[IPC] Error listing Google calendars:', error);
      // Return empty object format instead of array to maintain consistency
      return {
        myCalendars: [],
        otherCalendars: [],
        allCalendars: []
      };
    }
  });

  ipcMain.handle('list-notion-databases', async () => {
    console.log('[IPC] 🔍 list-notion-databases called');
    try {
      const { listDatabases } = require('./src/notion');
      console.log('[IPC] 📊 Calling listDatabases...');
      const result = await listDatabases();
      console.log('[IPC] 📊 listDatabases result:', result);
      return result.databases || [];
    } catch (error) {
      console.error('[IPC] ❌ Error listing Notion databases:', error);
      return [];
    }
  });

  ipcMain.handle('get-google-user-info', async () => {
    try {
      const { getGoogleUserInfo } = require('./src/google');
      return await getGoogleUserInfo();
    } catch (error) {
      console.error('[IPC] Error getting Google user info:', error);
      return null;
    }
  });

  ipcMain.handle('clear-all-data', async () => {
    try {
      // Clear stored tokens and data
      const keytar = require('keytar');
      await keytar.deletePassword('synk-app', 'google-tokens');
      await keytar.deletePassword('synk-app', 'notion-tokens');
      
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('connections-cleared');
      }
      
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error clearing data:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('open-external', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error opening external URL:', error);
      return { success: false, error: error.message };
    }
  });

  // Add sync functionality
  const syncManager = require('./src/syncManager');
  
  ipcMain.handle('start-sync', async (event, syncPairs) => {
    console.log('[Sync] Starting sync with pairs:', syncPairs);
    try {
      if (syncPairs && syncPairs.length > 0) {
        for (const pair of syncPairs) {
          const googleCalendarId = pair.google?.id || pair.google;
          const notionDatabaseId = pair.notion?.id || pair.notion;
          
          console.log(`[Sync] Processing sync pair: ${googleCalendarId} <-> ${notionDatabaseId}`);
          
          // Add this pair to active sync pairs
          syncManager.addSyncPair(googleCalendarId, notionDatabaseId);
          
          // Trigger immediate sync
          syncManager.onLocalChange(`${googleCalendarId}-${notionDatabaseId}`);
        }
        return { success: true, message: 'Sync started successfully' };
      } else {
        return { success: false, error: 'No sync pairs provided' };
      }
    } catch (error) {
      console.error('[Sync] Error starting sync:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-sync-stats', async () => {
    try {
      return syncManager.getStats();
    } catch (error) {
      console.error('[Sync] Error getting sync stats:', error);
      return { successfulSyncs: 0, lastSyncTimes: {} };
    }
  });

  ipcMain.handle('stop-sync', async () => {
    try {
      syncManager.stop();
      return { success: true };
    } catch (error) {
      console.error('[Sync] Error stopping sync:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('✅ IPC handler registered: start-google-oauth');
  console.log('✅ IPC handler registered: start-notion-oauth');
  console.log('✅ IPC handler registered: start-sync');
  console.log('✅ IPC handler registered: get-sync-stats');
  console.log('✅ IPC handler registered: stop-sync');
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