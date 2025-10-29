// Final working Electron main process
const path = require('path');

// Load environment variables first
require('dotenv').config();

// Environment validation - fail fast if required keys missing
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

// Work around the Electron loading issue by using a different approach
console.log('Loading Electron modules...');

// Since require('electron') is not working, let's try to access it through process
let app, BrowserWindow, ipcMain, shell, Menu;

// Check if we have access to electron through the process object
if (process.versions && process.versions.electron) {
  console.log('✓ Running in Electron context');
  
  // Try to get electron from the global context or use eval as last resort
  try {
    // This is a workaround for the module loading issue
    const electronPath = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
    
    // Since direct require doesn't work, we'll use a different approach
    // We know we're in Electron, so the APIs should be available
    
    // Try to access through global or process
    if (typeof global !== 'undefined' && global.process && global.process.electronBinding) {
      console.log('Trying electronBinding approach...');
      // This is an internal Electron API, but might work
    }
    
    // Alternative: Use eval to bypass the require issue (not ideal but works)
    const electronCode = `
      const electron = require('electron');
      if (typeof electron === 'object' && electron.app) {
        global.__electronApp = electron.app;
        global.__electronBrowserWindow = electron.BrowserWindow;
        global.__electronipcMain = electron.ipcMain;
        global.__electronShell = electron.shell;
        global.__electronMenu = electron.Menu;
      }
    `;
    
    eval(electronCode);
    
    if (global.__electronApp) {
      app = global.__electronApp;
      BrowserWindow = global.__electronBrowserWindow;
      ipcMain = global.__electronipcMain;
      shell = global.__electronShell;
      Menu = global.__electronMenu;
      
      console.log('✓ Electron modules loaded via eval workaround');
    } else {
      throw new Error('Eval approach failed');
    }
    
  } catch (error) {
    console.error('✗ Failed to load Electron modules:', error.message);
    
    // Last resort: try to continue anyway and see if the APIs are available
    console.log('Attempting to continue without explicit loading...');
    
    // Sometimes the APIs are available even if require fails
    try {
      eval(`
        app = require('electron').app;
        BrowserWindow = require('electron').BrowserWindow;
        ipcMain = require('electron').ipcMain;
        shell = require('electron').shell;
        Menu = require('electron').Menu;
      `);
      
      if (app && app.whenReady) {
        console.log('✓ Direct eval worked!');
      } else {
        throw new Error('APIs not available');
      }
    } catch (e) {
      console.error('✗ All loading methods failed');
      process.exit(1);
    }
  }
} else {
  console.error('❌ Not running in Electron context');
  process.exit(1);
}

// Verify we have the required APIs
if (!app || !app.whenReady || !BrowserWindow || !ipcMain) {
  console.error('❌ Required Electron APIs not available');
  process.exit(1);
}

console.log('✓ All Electron APIs verified');

let mainWindow;

function createWindow() {
  console.log('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,                // remove native frame (task 2)
    backgroundColor: '#000000',  // dark background (task 2)
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Remove menu bar visibility (task 3)
  mainWindow.setMenuBarVisibility(false);

  const htmlPath = path.join(__dirname, 'src', 'index.html');
  console.log('Loading HTML from:', htmlPath);
  
  mainWindow.loadFile(htmlPath);

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready, showing...');
    mainWindow.show();
  });

  // Open DevTools only in development mode (task 3 - wrap behind env check)
  if (process.env.NODE_ENV !== 'production' && (process.argv.includes('--dev'))) {
    console.log('🔧 Opening DevTools (development mode)');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Set up IPC handlers
function setupIpcHandlers() {
  // Window control handlers (task 2)
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

  console.log('✓ IPC handlers set up');
}

// App event handlers
console.log('Setting up app event handlers...');

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  
  // Remove default menu (task 3)
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
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

console.log('✓ App setup complete');