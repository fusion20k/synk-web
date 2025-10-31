// Main Electron process with all tasks implemented
const path = require('path');

// Load environment variables first
require('dotenv').config();

// Environment validation - fail fast if required keys missing (Task 0)
function validateEnvironment() {
  const requiredEnvVars = [
    'NOTION_CLIENT_ID',
    'NOTION_CLIENT_SECRET', 
    'NOTION_REDIRECT_URI',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI'
  ];

  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ STARTUP FAILED - Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file and ensure all OAuth credentials are configured.');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
  console.log(`📋 MODE: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 DEMO_MODE: ${process.env.DEMO_MODE || 'true'}`);
}

// Validate environment on startup
validateEnvironment();

// Initialize SyncManager (Task 1)
const syncManager = require('./src/syncManager');
console.log('✅ SyncManager initialized and started');

// Load Electron modules
let app, BrowserWindow, ipcMain, shell, Menu;

try {
  const electron = require('electron');
  console.log('Electron require result type:', typeof electron);
  console.log('Electron require result:', electron);
  
  if (typeof electron === 'object' && electron.app) {
    app = electron.app;
    BrowserWindow = electron.BrowserWindow;
    ipcMain = electron.ipcMain;
    shell = electron.shell;
    Menu = electron.Menu;
    console.log('✅ Electron modules loaded successfully');
  } else {
    throw new Error('Electron modules not available as expected');
  }
} catch (error) {
  console.error('❌ Failed to load Electron modules:', error.message);
  console.error('This appears to be an Electron installation issue.');
  console.error('Try: npm cache clean --force && rm -rf node_modules && npm install');
  process.exit(1);
}

let mainWindow;

function createWindow() {
  console.log('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,                // remove native frame (Task 2)
    backgroundColor: '#000000',  // dark background (Task 2)
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Remove menu bar visibility (Task 3)
  mainWindow.setMenuBarVisibility(false);

  const htmlPath = path.join(__dirname, 'src', 'index.html');
  console.log('Loading HTML from:', htmlPath);
  
  mainWindow.loadFile(htmlPath);

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready, showing...');
    mainWindow.show();
  });

  // Open DevTools only in development mode (Task 3 - wrap behind env check)
  if (process.env.NODE_ENV !== 'production' && process.argv.includes('--dev')) {
    console.log('🔧 Opening DevTools (development mode)');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Set up IPC handlers (Task 2)
function setupIpcHandlers() {
  // Window control handlers (Task 2)
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

  ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
  });

  // Sync management handlers (Task 1)
  ipcMain.handle('sync-trigger', (event, googleCalendarId, notionDatabaseId) => {
    const syncKey = `google-${googleCalendarId}:notion-${notionDatabaseId}`;
    syncManager.onLocalChange(syncKey);
    return { success: true, syncKey };
  });

  ipcMain.handle('sync-status', () => {
    return syncManager.getSyncStats();
  });

  ipcMain.handle('sync-clear-data', () => {
    syncManager.clearSyncData();
    return { success: true };
  });

  console.log('✅ IPC handlers set up');
}

// App event handlers
app.whenReady().then(() => {
  console.log('App ready, creating window...');
  
  // Remove default menu (Task 3)
  Menu.setApplicationMenu(null);
  
  // Set up IPC handlers
  setupIpcHandlers();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  
  // Stop SyncManager when app closes
  syncManager.stop();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

console.log('✅ App setup complete');