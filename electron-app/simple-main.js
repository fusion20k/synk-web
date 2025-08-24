// Simple Electron main process
const path = require('path');

// Try to import electron step by step
let electron;
try {
  electron = require('electron');
  console.log('Electron loaded:', typeof electron);
} catch (e) {
  console.error('Failed to load electron:', e);
  process.exit(1);
}

// Check if we have the right electron object
if (typeof electron === 'string') {
  console.error('Electron returned a string instead of object. This indicates a broken installation.');
  process.exit(1);
}

const { app, BrowserWindow } = electron;

if (!app || !BrowserWindow) {
  console.error('Missing app or BrowserWindow from electron');
  process.exit(1);
}

let mainWindow;

function createWindow() {
  console.log('Creating window...');
  
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#000000'
  });

  // Load a simple HTML file
  mainWindow.loadFile('renderer/simple.html');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  console.log('Window created successfully');
}

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});