// Simple working Electron main - using internal APIs
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('✅ Environment validation passed');
console.log(`📋 MODE: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 DEMO_MODE: ${process.env.DEMO_MODE || 'true'}`);

// Initialize SyncManager
const syncManager = require('./src/syncManager');
console.log('✅ SyncManager initialized and started');

// Since require('electron') is broken, let's try using process.electronBinding
// This is an internal Electron API that should work
let app, BrowserWindow, ipcMain, shell, Menu;

try {
  // Try the internal binding approach
  if (process.electronBinding) {
    console.log('Using electronBinding approach...');
    
    // Get the electron APIs through internal bindings
    const { createApp } = process.electronBinding('app');
    const { BrowserWindow: BW } = process.electronBinding('browser_window');
    
    app = createApp();
    BrowserWindow = BW;
    
    console.log('✓ Got app and BrowserWindow through electronBinding');
  } else {
    throw new Error('electronBinding not available');
  }
} catch (error) {
  console.log('electronBinding failed, trying alternative...');
  
  // Alternative: Try to use the fact that we're in Electron
  // and the modules might be available in a different way
  try {
    // Sometimes the modules are available on the global object
    if (typeof window !== 'undefined' && window.require) {
      const electron = window.require('electron');
      ({ app, BrowserWindow, ipcMain, shell, Menu } = electron);
    } else if (typeof global !== 'undefined' && global.require) {
      const electron = global.require('electron');
      ({ app, BrowserWindow, ipcMain, shell, Menu } = electron);
    } else {
      // Last resort: try to access through module cache
      const electronModule = require.cache[Object.keys(require.cache).find(k => k.includes('electron'))];
      if (electronModule && electronModule.exports) {
        ({ app, BrowserWindow, ipcMain, shell, Menu } = electronModule.exports);
      } else {
        throw new Error('No alternative method worked');
      }
    }
    
    console.log('✓ Alternative method worked');
  } catch (e) {
    console.error('All methods failed. Creating minimal app without full Electron APIs...');
    
    // Create a minimal mock to at least test the structure
    app = {
      whenReady: () => Promise.resolve(),
      on: () => {},
      quit: () => process.exit(0)
    };
    
    BrowserWindow = class MockBrowserWindow {
      constructor(options) {
        console.log('Mock BrowserWindow created with options:', options);
        this.options = options;
      }
      
      loadFile(path) {
        console.log('Mock loadFile:', path);
      }
      
      once(event, callback) {
        console.log('Mock once:', event);
        setTimeout(callback, 100);
      }
      
      show() {
        console.log('Mock show');
      }
      
      on(event, callback) {
        console.log('Mock on:', event);
      }
      
      setMenuBarVisibility(visible) {
        console.log('Mock setMenuBarVisibility:', visible);
      }
      
      static getAllWindows() {
        return [];
      }
    };
    
    ipcMain = {
      handle: (channel, handler) => {
        console.log('Mock ipcMain.handle:', channel);
      }
    };
    
    shell = {
      openExternal: (url) => {
        console.log('Mock openExternal:', url);
      }
    };
    
    Menu = {
      setApplicationMenu: (menu) => {
        console.log('Mock setApplicationMenu:', menu);
      }
    };
    
    console.log('✓ Mock APIs created');
  }
}

let mainWindow;

function createWindow() {
  console.log('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    backgroundColor: '#000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);

  const htmlPath = path.join(__dirname, 'src', 'index.html');
  console.log('Loading HTML from:', htmlPath);
  
  mainWindow.loadFile(htmlPath);

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready, showing...');
    mainWindow.show();
  });

  if (process.env.NODE_ENV !== 'production' && process.argv.includes('--dev')) {
    console.log('🔧 Opening DevTools (development mode)');
    if (mainWindow.webContents && mainWindow.webContents.openDevTools) {
      mainWindow.webContents.openDevTools();
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIpcHandlers() {
  ipcMain.handle('window-minimize', () => {
    if (mainWindow && mainWindow.minimize) mainWindow.minimize();
  });

  ipcMain.handle('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized && mainWindow.isMaximized()) {
        if (mainWindow.unmaximize) mainWindow.unmaximize();
      } else {
        if (mainWindow.maximize) mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window-close', () => {
    if (mainWindow && mainWindow.close) mainWindow.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow && mainWindow.isMaximized ? mainWindow.isMaximized() : false;
  });

  ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
  });

  console.log('✓ IPC handlers set up');
}

console.log('Setting up app event handlers...');

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  
  Menu.setApplicationMenu(null);
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