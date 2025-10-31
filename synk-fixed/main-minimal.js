// Minimal Electron main process - bypassing the issue
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

// Try to work around the Electron loading issue
console.log('Attempting to load Electron...');

// Check if we're running in Electron context
if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
  console.log('✓ Running in Electron context');
  
  // We're in Electron, so the require should work
  const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
  
  console.log('✓ Electron modules loaded successfully');
  
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

  console.log('✓ App event handlers set up');
  
} else {
  console.error('❌ Not running in Electron context');
  console.error('This script must be run with Electron, not Node.js');
  process.exit(1);
}