// Minimal window test - bypass require issues
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('Starting minimal window test...');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);

// Try different ways to load Electron
let electron;
let app, BrowserWindow;

try {
  // Method 1: Standard require
  electron = require('electron');
  console.log('Method 1 - Standard require result type:', typeof electron);
  console.log('Method 1 - Is array?', Array.isArray(electron));
  console.log('Method 1 - Keys (first 5):', Object.keys(electron).slice(0, 5));
  
  if (electron && typeof electron === 'object' && !Array.isArray(electron)) {
    app = electron.app;
    BrowserWindow = electron.BrowserWindow;
    console.log('Method 1 - app type:', typeof app);
    console.log('Method 1 - BrowserWindow type:', typeof BrowserWindow);
  }
} catch (error) {
  console.error('Method 1 failed:', error.message);
}

// If method 1 failed, try method 2
if (!app || typeof app.whenReady !== 'function') {
  try {
    // Method 2: Direct path resolution
    const electronPath = require.resolve('electron');
    console.log('Method 2 - Electron path:', electronPath);
    
    // Try loading from the resolved path
    const electronDir = path.dirname(electronPath);
    console.log('Method 2 - Electron directory:', electronDir);
    
    const electronModule = require(electronDir);
    console.log('Method 2 - Module type:', typeof electronModule);
    
    if (electronModule && typeof electronModule === 'object') {
      app = electronModule.app;
      BrowserWindow = electronModule.BrowserWindow;
      console.log('Method 2 - app type:', typeof app);
      console.log('Method 2 - BrowserWindow type:', typeof BrowserWindow);
    }
  } catch (error) {
    console.error('Method 2 failed:', error.message);
  }
}

// If both methods failed, try method 3
if (!app || typeof app.whenReady !== 'function') {
  try {
    // Method 3: Try to access the actual electron executable
    const electronExe = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
    console.log('Method 3 - Electron exe path:', electronExe);
    
    // This won't work for require, but let's see if the file exists
    const fs = require('fs');
    if (fs.existsSync(electronExe)) {
      console.log('Method 3 - Electron executable exists');
    } else {
      console.log('Method 3 - Electron executable not found');
    }
  } catch (error) {
    console.error('Method 3 failed:', error.message);
  }
}

// Final check
if (app && typeof app.whenReady === 'function') {
  console.log('✓ Successfully loaded Electron app object');
  
  // Create a simple window
  app.whenReady().then(() => {
    console.log('✓ Electron app ready');
    
    const mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    // Create a simple HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Window</title>
        <style>
          body { 
            background: #111; 
            color: white; 
            font-family: Arial; 
            text-align: center; 
            padding: 50px; 
          }
        </style>
      </head>
      <body>
        <h1>Electron Window Test</h1>
        <p>If you can see this, the window creation works!</p>
      </body>
      </html>
    `;
    
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    
    mainWindow.once('ready-to-show', () => {
      console.log('✓ Window ready to show');
      mainWindow.show();
      
      // Auto-close after 5 seconds for testing
      setTimeout(() => {
        console.log('✓ Test complete, closing window');
        app.quit();
      }, 5000);
    });
    
    mainWindow.on('closed', () => {
      console.log('✓ Window closed');
    });
  });
  
  app.on('window-all-closed', () => {
    app.quit();
  });
  
} else {
  console.error('✗ Failed to load Electron app object');
  console.error('app type:', typeof app);
  console.error('app value:', app);
  process.exit(1);
}