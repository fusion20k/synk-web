// Simple Electron main process that actually works
let app, BrowserWindow, ipcMain, shell;

try {
  const electron = require('electron');
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  ipcMain = electron.ipcMain;
  shell = electron.shell;
  
  // Disable GPU acceleration to fix the GPU warning
  if (app && app.disableHardwareAcceleration) {
    app.disableHardwareAcceleration();
    console.log('✅ GPU hardware acceleration disabled');
  }
} catch (error) {
  console.error('❌ Failed to load Electron:', error.message);
  process.exit(1);
}

const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('✅ Environment loaded');
console.log(`🔧 DEMO_MODE: ${process.env.DEMO_MODE || 'false'}`);

// Start OAuth server
console.log('🚀 Starting OAuth server...');
const { startOAuthServer } = require('./src/oauth-server');
let oauthServerInstance = null;
let mainWindow = null;

// Start OAuth server first
startOAuthServer().then(({ server, port }) => {
  console.log(`✅ OAuth server running on port ${port}`);
  oauthServerInstance = server;
  
  // Connect the main window to the OAuth server so it can send IPC messages
  if (mainWindow) {
    server.setMainWindow(mainWindow);
    console.log('✅ Main window connected to OAuth server');
  }
}).catch(error => {
  console.error('❌ Failed to start OAuth server:', error);
});

function createWindow() {
  console.log('🪟 Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false // Don't show until ready
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Main window shown');
    
    // Connect OAuth server to this window
    if (oauthServerInstance) {
      oauthServerInstance.setMainWindow(mainWindow);
      console.log('✅ OAuth server connected to main window');
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(() => {
  console.log('✅ Electron app ready');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for OAuth
ipcMain.handle('start-google-oauth', async (event, { demoMode }) => {
  console.log('🔄 Starting Google OAuth flow...');
  
  try {
    const DEMO_MODE = demoMode || process.env.DEMO_MODE === 'true';
    const GOOGLE_CLIENT_ID = DEMO_MODE ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_REDIRECT_URI = DEMO_MODE ? process.env.GOOGLE_REDIRECT_URI_DEMO : process.env.GOOGLE_REDIRECT_URI;
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
      throw new Error('Missing Google OAuth configuration');
    }
    
    // Generate OAuth URL
    const crypto = require('crypto');
    const state = crypto.randomBytes(16).toString('hex');
    
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: process.env.GOOGLE_SCOPES || 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
      state: state
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    
    console.log('🌐 Opening OAuth URL:', authUrl);
    await shell.openExternal(authUrl);
    
    return { success: true, message: 'OAuth flow started' };
    
  } catch (error) {
    console.error('❌ OAuth start failed:', error.message);
    return { error: error.message };
  }
});

ipcMain.handle('start-notion-oauth', async (event, { demoMode }) => {
  console.log('🔄 Starting Notion OAuth flow...');
  
  try {
    const DEMO_MODE = demoMode || process.env.DEMO_MODE === 'true';
    const NOTION_CLIENT_ID = DEMO_MODE ? process.env.NOTION_CLIENT_ID_DEMO : process.env.NOTION_CLIENT_ID;
    const NOTION_REDIRECT_URI = DEMO_MODE ? process.env.NOTION_REDIRECT_URI_DEMO : process.env.NOTION_REDIRECT_URI;
    
    if (!NOTION_CLIENT_ID || !NOTION_REDIRECT_URI) {
      throw new Error('Missing Notion OAuth configuration');
    }
    
    // Generate OAuth URL
    const crypto = require('crypto');
    const state = crypto.randomBytes(16).toString('hex');
    
    const params = new URLSearchParams({
      client_id: NOTION_CLIENT_ID,
      redirect_uri: NOTION_REDIRECT_URI,
      response_type: 'code',
      owner: 'user',
      state: state
    });

    const authUrl = `https://api.notion.com/v1/oauth/authorize?${params}`;
    
    console.log('🌐 Opening Notion OAuth URL:', authUrl);
    await shell.openExternal(authUrl);
    
    return { success: true, message: 'Notion OAuth flow started' };
    
  } catch (error) {
    console.error('❌ Notion OAuth start failed:', error.message);
    return { error: error.message };
  }
});

console.log('✅ Simple Electron main process loaded successfully');