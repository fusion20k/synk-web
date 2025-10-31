// Workaround for Electron import issue
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('Starting Electron app with workaround...');
console.log('Process versions:', process.versions);
console.log('Running in Electron:', !!process.versions.electron);

// Try different methods to access Electron APIs
let app, BrowserWindow, ipcMain, shell, Menu;

// Method 1: Try require with different approaches
function tryElectronImport() {
  const methods = [
    () => require('electron'),
    () => global.require('electron'),
    () => process.mainModule.require('electron'),
    () => eval('require("electron")'),
  ];
  
  for (let i = 0; i < methods.length; i++) {
    try {
      console.log(`Trying method ${i + 1}...`);
      const electron = methods[i]();
      console.log(`Method ${i + 1} result type:`, typeof electron);
      
      if (typeof electron === 'object' && electron.app) {
        console.log(`✓ Method ${i + 1} worked!`);
        return electron;
      }
    } catch (error) {
      console.log(`Method ${i + 1} failed:`, error.message);
    }
  }
  
  return null;
}

// Method 2: Try accessing from global/process
function tryGlobalAccess() {
  const locations = [
    () => global.electron,
    () => process.electron,
    () => global.require && global.require('electron'),
  ];
  
  for (let i = 0; i < locations.length; i++) {
    try {
      console.log(`Trying global access ${i + 1}...`);
      const electron = locations[i]();
      
      if (electron && typeof electron === 'object' && electron.app) {
        console.log(`✓ Global access ${i + 1} worked!`);
        return electron;
      }
    } catch (error) {
      console.log(`Global access ${i + 1} failed:`, error.message);
    }
  }
  
  return null;
}

// Try to get Electron APIs
const electron = tryElectronImport() || tryGlobalAccess();

if (electron && electron.app) {
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  ipcMain = electron.ipcMain;
  shell = electron.shell;
  Menu = electron.Menu;
  
  console.log('✓ Successfully obtained Electron APIs');
} else {
  console.error('✗ Failed to obtain Electron APIs');
  console.error('This might be a fundamental Electron installation issue');
  process.exit(1);
}

// Simple window creation
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
}

// Simple IPC handlers
ipcMain.handle('oauth-google-start', async () => {
  console.log('Google OAuth requested (test)');
  return { demo: true, service: 'google', message: 'Test response' };
});

ipcMain.handle('oauth-notion-start', async () => {
  console.log('Notion OAuth requested (test)');
  return { demo: true, service: 'notion', message: 'Test response' };
});

ipcMain.handle('open-external', (event, url) => {
  console.log('Opening external URL:', url);
  shell.openExternal(url);
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

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