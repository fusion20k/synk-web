// Working Electron main process
const path = require('path');
require('dotenv').config();

console.log('🚀 Starting Synk...');

// Try different ways to load Electron
let electron;
let app, BrowserWindow, ipcMain, shell;

try {
  // Method 1: Direct require
  electron = require('electron');
  if (typeof electron === 'object' && electron.app) {
    ({ app, BrowserWindow, ipcMain, shell } = electron);
    console.log('✅ Electron loaded via direct require');
  } else {
    throw new Error('Electron object invalid');
  }
} catch (error) {
  console.log('❌ Direct require failed, trying alternative...');
  
  try {
    // Method 2: Process-based loading
    if (process.versions.electron) {
      const electronPath = path.join(__dirname, 'node_modules', 'electron', 'index.js');
      delete require.cache[electronPath];
      electron = require(electronPath);
      
      if (typeof electron === 'object' && electron.app) {
        ({ app, BrowserWindow, ipcMain, shell } = electron);
        console.log('✅ Electron loaded via alternative method');
      } else {
        throw new Error('Alternative method failed');
      }
    } else {
      throw new Error('Not running in Electron context');
    }
  } catch (altError) {
    console.error('❌ All Electron loading methods failed');
    console.error('Direct error:', error.message);
    console.error('Alternative error:', altError.message);
    process.exit(1);
  }
}

// Verify Electron components
if (!app || !BrowserWindow || !ipcMain) {
  console.error('❌ Missing Electron components');
  process.exit(1);
}

console.log('✅ All Electron components loaded successfully');

let mainWindow;

function createWindow() {
  console.log('🪟 Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  mainWindow.loadFile('src/index.html');
  
  console.log('✅ Window created and loaded');
}

// Initialize sync manager
console.log('🔄 Initializing sync manager...');
const SyncManager = require('./src/syncManager');
const syncManager = new SyncManager();

// IPC Handlers
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
    return { successfulSyncs: 0, lastSyncTimes: {}, activeSyncPairs: [] };
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

// OAuth handlers (simplified for now)
ipcMain.handle('start-google-oauth', async () => {
  console.log('[OAuth] Google OAuth requested');
  return { success: true, message: 'OAuth flow started' };
});

ipcMain.handle('start-notion-oauth', async () => {
  console.log('[OAuth] Notion OAuth requested');
  return { success: true, message: 'OAuth flow started' };
});

// App event handlers
app.whenReady().then(() => {
  console.log('🎉 App ready, creating window...');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

console.log('✅ Main process setup complete');