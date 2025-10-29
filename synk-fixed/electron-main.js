const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const log = require('electron-log');

// Load environment variables
require('dotenv').config();

const store = new Store();
let mainWindow;

function createWindow() {
  console.log('🪟 Creating main window...');
  console.log("Created window in:", __filename);
  
  const iconPath = path.join(__dirname, 'favicon.jpg'); // keep within synk-fixed

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,                 // <<< MUST be false to remove OS border
    show: false,                  // show after ready-to-show
    autoHideMenuBar: true,        // hide menu bar (toggle with Alt if needed)
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: iconPath
  });

  // hide menu always (extra safety)
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools only in development when explicitly needed
  if (
    process.env.NODE_ENV === 'development' &&
    (process.env.DEBUG_PROD === 'true' || process.env.OPEN_DEVTOOLS === 'true')
  ) {
    // dev only: open devtools on the right for debugging
    mainWindow.webContents.openDevTools({ mode: 'right' });
  }
}

// App event handlers
app.whenReady().then(() => {
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

// IPC Handlers
ipcMain.handle('start-google-oauth', async (event, options = {}) => {
  console.log('🔄 Starting Google OAuth flow...');
  
  try {
    const DEMO_MODE = options.demoMode || process.env.DEMO_MODE === 'true';
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
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    // Open OAuth window
    const authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await authWindow.loadURL(authUrl);
    
    return { success: true, authUrl };
  } catch (error) {
    log.error('Google OAuth error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('connect-google', async () => {
  try {
    const { googleOAuth } = require('./src/oauth');
    const result = await googleOAuth(shell);
    return result;
  } catch (error) {
    log.error('Google OAuth error:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('start-notion-oauth', async (event, options = {}) => {
  console.log('🔄 Starting Notion OAuth flow...');
  
  try {
    const DEMO_MODE = options.demoMode || process.env.DEMO_MODE === 'true';
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
    
    // Open OAuth window
    const authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await authWindow.loadURL(authUrl);
    
    return { success: true, authUrl };
  } catch (error) {
    log.error('Notion OAuth error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('connect-notion', async () => {
  try {
    const { notionOAuth } = require('./src/oauth');
    const result = await notionOAuth(shell);
    return result;
  } catch (error) {
    log.error('Notion OAuth error:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('list-google-calendars', async () => {
  try {
    const { listGoogleCalendars } = require('./src/google');
    return await listGoogleCalendars();
  } catch (error) {
    log.error('List calendars error:', error);
    return [];
  }
});

ipcMain.handle('list-notion-databases', async () => {
  try {
    const { listDatabases } = require('./src/notion');
    return await listDatabases();
  } catch (error) {
    log.error('List databases error:', error);
    return [];
  }
});

ipcMain.handle('get-google-user-info', async () => {
  try {
    const { getGoogleUserInfo } = require('./src/google');
    return await getGoogleUserInfo();
  } catch (error) {
    log.error('Get user info error:', error);
    return null;
  }
});

// Window controls
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

// Demo mode toggle
ipcMain.handle('toggle-demo', async (event, enabled) => {
  log.info('Demo mode toggled:', enabled);
  return { ok: true, demoMode: enabled };
});

console.log('Synk app initialized successfully');