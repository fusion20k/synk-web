// Fixed approach for Electron main process
console.log('Starting Electron main process...');

// The issue is that require('electron') returns a string instead of the API object
// This happens when the Electron context is not properly initialized
// Let's try a different approach using dynamic imports and context detection

async function initializeElectron() {
  console.log('Initializing Electron...');
  
  // Method 1: Try using dynamic import (ES modules)
  try {
    console.log('Trying dynamic import...');
    const electron = await import('electron');
    if (electron && electron.app) {
      console.log('✓ Dynamic import worked!');
      return electron;
    }
  } catch (error) {
    console.log('Dynamic import failed:', error.message);
  }
  
  // Method 2: Try using createRequire
  try {
    console.log('Trying createRequire...');
    const { createRequire } = require('module');
    const electronRequire = createRequire(import.meta.url || __filename);
    const electron = electronRequire('electron');
    if (electron && typeof electron === 'object' && electron.app) {
      console.log('✓ createRequire worked!');
      return electron;
    }
  } catch (error) {
    console.log('createRequire failed:', error.message);
  }
  
  // Method 3: Try accessing through Node.js module system
  try {
    console.log('Trying Node.js module system...');
    const Module = require('module');
    const originalLoad = Module._load;
    
    // Intercept module loading
    Module._load = function(request, parent, isMain) {
      if (request === 'electron') {
        // Try to return the actual Electron object
        const electronPath = require.resolve('electron');
        console.log('Electron path:', electronPath);
        
        // Try to load the actual Electron module
        try {
          const electronModule = originalLoad.call(this, electronPath + '/index.js', parent, isMain);
          if (electronModule && electronModule.app) {
            console.log('✓ Module system intercept worked!');
            return electronModule;
          }
        } catch (e) {
          console.log('Module intercept failed:', e.message);
        }
      }
      return originalLoad.call(this, request, parent, isMain);
    };
    
    const electron = require('electron');
    
    // Restore original loader
    Module._load = originalLoad;
    
    if (electron && typeof electron === 'object' && electron.app) {
      console.log('✓ Module system approach worked!');
      return electron;
    }
  } catch (error) {
    console.log('Module system approach failed:', error.message);
  }
  
  // Method 4: Try direct file access
  try {
    console.log('Trying direct file access...');
    const electronPath = require.resolve('electron');
    const fs = require('fs');
    const path = require('path');
    
    // Look for the actual Electron module files
    const electronDir = path.dirname(electronPath);
    const possibleFiles = [
      path.join(electronDir, 'index.js'),
      path.join(electronDir, 'lib', 'index.js'),
      path.join(electronDir, 'dist', 'index.js'),
    ];
    
    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        console.log('Found Electron file:', file);
        try {
          const electron = require(file);
          if (electron && electron.app) {
            console.log('✓ Direct file access worked!');
            return electron;
          }
        } catch (e) {
          console.log('Direct file access failed for', file, ':', e.message);
        }
      }
    }
  } catch (error) {
    console.log('Direct file access failed:', error.message);
  }
  
  return null;
}

// Initialize Electron and start the app
initializeElectron().then(electron => {
  if (!electron || !electron.app) {
    console.error('❌ Failed to initialize Electron APIs');
    console.error('This appears to be a fundamental Electron installation or environment issue');
    process.exit(1);
  }
  
  console.log('✓ Electron APIs initialized successfully');
  
  // Extract APIs
  const { app, BrowserWindow, ipcMain, shell } = electron;
  const path = require('path');
  
  let mainWindow;
  
  function createWindow() {
    console.log('Creating main window...');
    
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
    console.log('🔗 Google OAuth requested');
    return { demo: true, service: 'google', message: 'OAuth working' };
  });

  ipcMain.handle('oauth-notion-start', async () => {
    console.log('🔗 Notion OAuth requested');
    return { demo: true, service: 'notion', message: 'OAuth working' };
  });

  ipcMain.handle('open-external', (event, url) => {
    console.log('🌐 Opening external URL:', url);
    shell.openExternal(url);
  });

  ipcMain.handle('window-close', () => {
    console.log('🪟 Window close requested');
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
  
}).catch(error => {
  console.error('❌ Failed to initialize Electron:', error);
  process.exit(1);
});