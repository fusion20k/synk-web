// Electron main process using context-aware approach
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('Starting Electron app...');
console.log('Electron version:', process.versions.electron);

// In Electron context, try to access the APIs directly
let app, BrowserWindow, ipcMain, shell, Menu;

// When running in Electron, the APIs might be available in different ways
if (process.versions.electron) {
  try {
    // Try to access Electron APIs through the module system
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    // Override require temporarily to catch Electron
    Module.prototype.require = function(id) {
      if (id === 'electron') {
        // Return the actual Electron object if we can find it
        if (global.process && global.process.electronBinding) {
          const electronBinding = global.process.electronBinding;
          
          // Try to construct the Electron API object
          try {
            const electronAPI = {
              app: electronBinding('app'),
              BrowserWindow: electronBinding('browser_window').BrowserWindow,
              ipcMain: electronBinding('ipc_main'),
              shell: electronBinding('shell'),
              Menu: electronBinding('menu').Menu
            };
            
            console.log('✓ Successfully created Electron API object from bindings');
            return electronAPI;
          } catch (bindingError) {
            console.log('Binding approach failed:', bindingError.message);
          }
        }
      }
      
      return originalRequire.apply(this, arguments);
    };
    
    // Now try to require electron
    const electron = require('electron');
    
    // Restore original require
    Module.prototype.require = originalRequire;
    
    if (typeof electron === 'object' && electron.app) {
      app = electron.app;
      BrowserWindow = electron.BrowserWindow;
      ipcMain = electron.ipcMain;
      shell = electron.shell;
      Menu = electron.Menu;
      console.log('✓ Electron APIs loaded successfully');
    } else {
      throw new Error('Electron APIs not available');
    }
    
  } catch (error) {
    console.error('Failed to load Electron APIs:', error.message);
    
    // Last resort: try to continue with a minimal setup
    console.log('Attempting minimal setup...');
    
    // Sometimes in Electron context, we can access APIs directly
    if (typeof global !== 'undefined') {
      try {
        // Check if APIs are available globally
        app = global.app || (global.process && global.process.app);
        BrowserWindow = global.BrowserWindow;
        ipcMain = global.ipcMain;
        shell = global.shell;
        Menu = global.Menu;
        
        if (app && app.whenReady) {
          console.log('✓ Found APIs in global scope');
        } else {
          throw new Error('APIs not in global scope');
        }
      } catch (globalError) {
        console.error('Global access failed:', globalError.message);
        console.error('Unable to access Electron APIs');
        process.exit(1);
      }
    }
  }
} else {
  console.error('Not running in Electron context');
  process.exit(1);
}

// Verify we have the required APIs
if (!app || typeof app.whenReady !== 'function') {
  console.error('App API not available');
  process.exit(1);
}

if (!BrowserWindow) {
  console.error('BrowserWindow API not available');
  process.exit(1);
}

if (!ipcMain) {
  console.error('ipcMain API not available');
  process.exit(1);
}

console.log('✓ All required Electron APIs are available');

// Rest of the application
let mainWindow;

function createWindow() {
  console.log('Creating window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'preload.js')
    }
  });

  mainWindow.loadFile('src/index.html');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  console.log('✓ Window created');
}

// IPC handlers
ipcMain.handle('oauth-google-start', async () => {
  console.log('Google OAuth requested');
  return { demo: true, service: 'google', message: 'OAuth test' };
});

ipcMain.handle('oauth-notion-start', async () => {
  console.log('Notion OAuth requested');
  return { demo: true, service: 'notion', message: 'OAuth test' };
});

ipcMain.handle('open-external', (event, url) => {
  console.log('Opening external URL:', url);
  if (shell && shell.openExternal) {
    shell.openExternal(url);
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

console.log('✓ IPC handlers registered');

// App event handlers
app.whenReady().then(() => {
  console.log('✓ App ready, creating window...');
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

console.log('✓ Main process setup complete');