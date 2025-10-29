// Basic Electron main process - step by step approach
console.log('=== Starting Electron Main Process ===');
console.log('Node version:', process.version);
console.log('Electron version:', process.versions.electron);
console.log('Platform:', process.platform);

// Step 1: Try to require electron with detailed logging
console.log('\n=== Step 1: Requiring Electron ===');
let electronModule;
try {
  electronModule = require('electron');
  console.log('✓ require("electron") succeeded');
  console.log('Type:', typeof electronModule);
  console.log('Value:', electronModule);
  
  if (typeof electronModule === 'string') {
    console.log('⚠️  Electron returned a string (path), not an object');
    console.log('This usually means we need to run this with the electron executable');
  }
} catch (error) {
  console.error('✗ require("electron") failed:', error.message);
  process.exit(1);
}

// Step 2: Try to extract APIs
console.log('\n=== Step 2: Extracting APIs ===');
let app, BrowserWindow, ipcMain, shell;

if (typeof electronModule === 'object' && electronModule.app) {
  console.log('✓ Electron module is an object with app property');
  app = electronModule.app;
  BrowserWindow = electronModule.BrowserWindow;
  ipcMain = electronModule.ipcMain;
  shell = electronModule.shell;
} else if (typeof electronModule === 'string') {
  console.log('⚠️  Electron module is a string, trying alternative approaches...');
  
  // Alternative 1: Try process.electronBinding
  if (process.electronBinding) {
    console.log('Trying process.electronBinding...');
    try {
      app = process.electronBinding('app');
      console.log('✓ Got app from electronBinding');
    } catch (e) {
      console.log('✗ electronBinding failed:', e.message);
    }
  }
  
  // Alternative 2: Try global access
  if (!app && typeof global !== 'undefined') {
    console.log('Trying global access...');
    app = global.app;
    BrowserWindow = global.BrowserWindow;
    ipcMain = global.ipcMain;
    shell = global.shell;
    
    if (app) {
      console.log('✓ Found APIs in global scope');
    }
  }
  
  // Alternative 3: Try different require approaches
  if (!app) {
    console.log('Trying alternative require approaches...');
    const alternatives = [
      () => eval('require("electron")'),
      () => module.require('electron'),
      () => global.require && global.require('electron')
    ];
    
    for (let i = 0; i < alternatives.length; i++) {
      try {
        const result = alternatives[i]();
        if (typeof result === 'object' && result.app) {
          console.log(`✓ Alternative ${i + 1} worked`);
          app = result.app;
          BrowserWindow = result.BrowserWindow;
          ipcMain = result.ipcMain;
          shell = result.shell;
          break;
        }
      } catch (e) {
        console.log(`✗ Alternative ${i + 1} failed:`, e.message);
      }
    }
  }
}

// Step 3: Verify APIs
console.log('\n=== Step 3: Verifying APIs ===');
console.log('app:', typeof app, app ? '✓' : '✗');
console.log('BrowserWindow:', typeof BrowserWindow, BrowserWindow ? '✓' : '✗');
console.log('ipcMain:', typeof ipcMain, ipcMain ? '✓' : '✗');
console.log('shell:', typeof shell, shell ? '✓' : '✗');

if (!app || typeof app.whenReady !== 'function') {
  console.error('\n❌ FATAL: Cannot access Electron app API');
  console.error('This suggests a fundamental issue with the Electron installation or environment');
  console.error('Possible solutions:');
  console.error('1. Reinstall Electron: npm uninstall electron && npm install electron');
  console.error('2. Clear npm cache: npm cache clean --force');
  console.error('3. Delete node_modules and reinstall: rm -rf node_modules && npm install');
  console.error('4. Try a different Electron version');
  process.exit(1);
}

console.log('\n✓ All required APIs are available');
console.log('\n=== Step 4: Setting up Electron app ===');

// Now proceed with the actual Electron app setup
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
  
  console.log('✓ Window created successfully');
}

// IPC handlers
if (ipcMain) {
  console.log('Setting up IPC handlers...');
  
  ipcMain.handle('oauth-google-start', async () => {
    console.log('🔗 Google OAuth requested');
    return { demo: true, service: 'google', message: 'OAuth handler working' };
  });

  ipcMain.handle('oauth-notion-start', async () => {
    console.log('🔗 Notion OAuth requested');
    return { demo: true, service: 'notion', message: 'OAuth handler working' };
  });

  ipcMain.handle('open-external', (event, url) => {
    console.log('🌐 Opening external URL:', url);
    if (shell && shell.openExternal) {
      shell.openExternal(url);
    }
  });

  ipcMain.handle('window-close', () => {
    console.log('🪟 Window close requested');
    if (mainWindow) mainWindow.close();
  });
  
  console.log('✓ IPC handlers registered');
}

// App event handlers
console.log('Setting up app event handlers...');

app.whenReady().then(() => {
  console.log('✓ Electron app is ready');
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

console.log('✓ App event handlers registered');
console.log('\n🚀 Main process setup complete - waiting for app.whenReady()...');