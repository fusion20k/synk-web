// Super minimal Electron main - just show a window
const path = require('path');

console.log('Starting super minimal Electron app...');

// Try to work around the Electron import issue
let app, BrowserWindow;

// Since require('electron') returns a string instead of an object,
// let's try to run this file directly with the electron executable
// This should work because when run with electron, the context is different

try {
  // When this file is run with `electron main-super-minimal.js`,
  // the electron APIs should be available in the global context
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    console.log('Running in Electron context, version:', process.versions.electron);
    
    // In Electron context, try to get the APIs
    const electron = require('electron');
    console.log('Electron in context type:', typeof electron);
    
    if (typeof electron === 'object' && electron.app) {
      app = electron.app;
      BrowserWindow = electron.BrowserWindow;
      console.log('✓ Got Electron APIs from context');
    } else {
      throw new Error('Electron APIs not available in context');
    }
  } else {
    throw new Error('Not running in Electron context');
  }
} catch (error) {
  console.error('Failed to get Electron APIs:', error.message);
  console.log('This file must be run with: electron main-super-minimal.js');
  process.exit(1);
}

let mainWindow;

function createWindow() {
  console.log('Creating window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#000000',
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'preload.js')
    }
  });

  // Load the HTML file
  const htmlPath = path.join(__dirname, 'src', 'index.html');
  console.log('Loading HTML from:', htmlPath);
  
  mainWindow.loadFile(htmlPath);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('✓ Window ready, showing...');
    mainWindow.show();
    mainWindow.focus();
    console.log('✓ Main window visible');
  });

  // Force show after timeout
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('Forcing window to show...');
      mainWindow.show();
      mainWindow.focus();
    }
  }, 3000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
if (app && typeof app.whenReady === 'function') {
  console.log('Setting up app event handlers...');
  
  app.whenReady().then(() => {
    console.log('✓ Electron app ready');
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
  
} else {
  console.error('✗ App object not available or invalid');
  console.error('app type:', typeof app);
  process.exit(1);
}