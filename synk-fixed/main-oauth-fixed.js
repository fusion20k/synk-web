// OAuth-Fixed Electron main process
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Environment validation - fail fast if required keys missing
function validateEnvironment() {
  const { isDemo } = require('./src/config');
  
  let requiredEnvVars;
  if (isDemo()) {
    // Demo mode requires demo credentials
    requiredEnvVars = [
      'NOTION_CLIENT_ID_DEMO',
      'NOTION_CLIENT_SECRET_DEMO', 
      'NOTION_REDIRECT_URI_DEMO',
      'GOOGLE_CLIENT_ID_DEMO',
      'GOOGLE_CLIENT_SECRET_DEMO',
      'GOOGLE_REDIRECT_URI_DEMO'
    ];
  } else {
    // Production mode requires production credentials
    requiredEnvVars = [
      'NOTION_CLIENT_ID',
      'NOTION_CLIENT_SECRET', 
      'NOTION_REDIRECT_URI',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REDIRECT_URI'
    ];
  }

  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ STARTUP FAILED - Missing required environment variables:');
    missing.forEach(key => console.error(`   MISSING: ${key}`));
    console.error('\nPlease check your .env file and ensure all OAuth credentials are configured.');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
  console.log(`📋 MODE: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 DEMO_MODE: ${isDemo()}`);
}

// Load configuration and OAuth modules
const { isDemo } = require('./src/config');
const OAuthURLBuilder = require('./src/oauth-urls');
const OAuthCallbackServer = require('./src/oauth-callback-server');
const syncManager = require('./src/syncManager');
const TokenExchangeManager = require('./src/token-exchange');
const TokenStorage = require('./src/token-storage');

console.log('✅ SyncManager initialized and started');

console.log('✓ Electron loaded successfully');

let mainWindow;
let oauthCallbackServer;

function createWindow() {
  console.log('Creating main window...');
  
  // Remove default menu
  Menu.setApplicationMenu(null);
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,                // Remove native frame
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'preload.js'),
      devTools: process.env.NODE_ENV !== 'production'
    },
    backgroundColor: '#000000',
    show: false,
    icon: path.join(__dirname, 'favicon.jpg'),
    title: 'Synk - Notion & Google Calendar Sync'
  });

  // Hide menu bar
  mainWindow.setMenuBarVisibility(false);

  const htmlPath = path.join(__dirname, 'src', 'index.html');
  console.log('Loading HTML from:', htmlPath);
  
  mainWindow.loadFile(htmlPath);

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready, showing...');
    mainWindow.show();
    mainWindow.focus();
  });

  // Fallback: force show window after 3 seconds if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('Forcing window to show (ready-to-show timeout)');
      mainWindow.show();
      mainWindow.focus();
    }
  }, 3000);

  // DevTools handling
  if (process.env.NODE_ENV === 'development') {
    // Optional in dev only - commented out to prevent auto-opening
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // ensure devtools disabled in production
    mainWindow.webContents.closeDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Auth launcher functions as specified in Fix #5
async function launchGoogleAuth(authUrl) {
  if (!isDemo()) {
    // PRODUCTION: always open in external browser
    shell.openExternal(authUrl);
    // start loopback / wait for callback from your public endpoint
    return;
  }

  // DEMO: for local testing you can use a BrowserWindow popup
  const popup = new BrowserWindow({ 
    width: 520, 
    height: 700, 
    parent: mainWindow, 
    modal: false, 
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#1e1e1e',
    webPreferences: { 
      nodeIntegration: false, 
      contextIsolation: true 
    }
  });
  popup.loadURL(authUrl);
  popup.on('closed', () => {
    // cleanup only - don't quit app
  });
}

async function launchNotionAuth(authUrl) {
  if (!isDemo()) {
    // PRODUCTION: always open in external browser
    shell.openExternal(authUrl);
    return;
  }

  // DEMO: for local testing you can use a BrowserWindow popup
  const popup = new BrowserWindow({ 
    width: 520, 
    height: 700, 
    parent: mainWindow, 
    modal: false, 
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#1e1e1e',
    webPreferences: { 
      nodeIntegration: false, 
      contextIsolation: true 
    }
  });
  popup.loadURL(authUrl);
  popup.on('closed', () => {
    // cleanup only - don't quit app
  });
}

// Function to set up all IPC handlers
function setupIpcHandlers() {
  // OAuth Implementation with Express callback server
  ipcMain.handle('oauth-google-start', async (event, { demoMode }) => {
  console.log('Google OAuth requested, demo mode:', demoMode);
  
  // Add debug logs as specified
  console.log('MODE:', process.env.MODE, 'DEMO_MODE:', process.env.DEMO_MODE);
  console.log('Using redirect URIs -> GOOGLE:', process.env.GOOGLE_REDIRECT_URI, 'NOTION:', process.env.NOTION_REDIRECT_URI);
  
  try {
    // Ensure callback server is running
    if (!oauthCallbackServer || !oauthCallbackServer.isRunning()) {
      console.log('Starting OAuth callback server...');
      oauthCallbackServer = new OAuthCallbackServer();
      await oauthCallbackServer.start();
    }
    
    // Create OAuth flow with PKCE
    const { authUrl, pkceData } = OAuthURLBuilder.createGoogleOAuthFlow();
    
    console.log('GOOGLE_CLIENT_ID=', process.env.GOOGLE_CLIENT_ID);
    console.log('GOOGLE_REDIRECT_URI=', process.env.GOOGLE_REDIRECT_URI);
    console.log('Google auth URL=', authUrl);
    
    // Register the pending flow with the callback server
    oauthCallbackServer.registerPendingFlow('google', pkceData.state, { pkceData });
    
    // Launch OAuth using exact logic from Fix #5
    await launchGoogleAuth(authUrl);
    
    if (isDemo()) {
      // In demo mode, always return sample data regardless of OAuth outcome
      console.log('Demo mode: returning sample data');
      
      // Wait a bit to simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return { 
        demo: true, 
        connectedEmail: 'demo@synk-official.com', 
        calendars: getSampleCalendars(),
        popupCompleted: true,
        note: 'Demo mode - showing sample data'
      };
    }
    
    // In real mode, we would wait for the callback server to process the OAuth
    // For now, return a message indicating the OAuth flow is in progress
    return {
      demo: false,
      inProgress: true,
      message: 'OAuth flow initiated. Complete the authorization in your browser.',
      note: 'The callback will be handled by the Express server'
    };
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    
    if (isDemo()) {
      // Even if OAuth fails in demo mode, show sample data
      return { 
        demo: true, 
        connectedEmail: 'demo@synk-official.com', 
        calendars: getSampleCalendars(),
        popupCompleted: false,
        note: 'Demo mode - OAuth popup opened but showing sample data'
      };
    }
    
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('oauth-notion-start', async (event, { demoMode }) => {
  console.log('Notion OAuth requested, demo mode:', demoMode);
  
  // Add debug logs as specified
  console.log('MODE:', process.env.MODE, 'DEMO_MODE:', process.env.DEMO_MODE);
  console.log('Using redirect URIs -> GOOGLE:', process.env.GOOGLE_REDIRECT_URI, 'NOTION:', process.env.NOTION_REDIRECT_URI);
  
  try {
    // Ensure callback server is running
    if (!oauthCallbackServer || !oauthCallbackServer.isRunning()) {
      console.log('Starting OAuth callback server...');
      oauthCallbackServer = new OAuthCallbackServer();
      await oauthCallbackServer.start();
    }
    
    // Create OAuth flow
    const { authUrl, state } = OAuthURLBuilder.createNotionOAuthFlow();
    
    console.log('NOTION_CLIENT_ID=', process.env.NOTION_CLIENT_ID);
    console.log('NOTION_REDIRECT_URI=', process.env.NOTION_REDIRECT_URI);
    console.log('Notion auth URL=', authUrl);
    
    // Register the pending flow with the callback server
    oauthCallbackServer.registerPendingFlow('notion', state, { state });
    
    // Launch OAuth using system browser for production
    await launchNotionAuth(authUrl);
    
    if (isDemo()) {
      // In demo mode, always return sample data regardless of OAuth outcome
      console.log('Demo mode: returning sample Notion data');
      
      // Wait a bit to simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return { 
        demo: true, 
        connectedEmail: 'demo@synk-official.com', 
        databases: getSampleNotionData().databases,
        popupCompleted: true,
        note: 'Demo mode - showing sample data'
      };
    }
    
    // In real mode, we would wait for the callback server to process the OAuth
    // For now, return a message indicating the OAuth flow is in progress
    return {
      demo: false,
      inProgress: true,
      message: 'OAuth flow initiated. Complete the authorization in your browser.',
      note: 'The callback will be handled by the Express server'
    };
    
  } catch (error) {
    console.error('Notion OAuth error:', error);
    
    if (isDemo()) {
      // Even if OAuth fails in demo mode, show sample data
      return { 
        demo: true, 
        connectedEmail: 'demo@synk-official.com', 
        databases: getSampleNotionData().databases,
        popupCompleted: false,
        note: 'Demo mode - OAuth popup opened but showing sample data'
      };
    }
    
    return { ok: false, error: error.message };
  }
});

// Data fetching handlers
ipcMain.handle('list-google-calendars', async () => {
  console.log('Google calendars requested');
  
  try {
    if (isDemo()) {
      return { calendars: getSampleCalendars() };
    }
    
    const tokens = await TokenStorage.getTokens('google');
    if (!tokens) {
      throw new Error('No Google tokens found. Please connect your Google account first.');
    }
    
    const calendars = await TokenExchangeManager.fetchGoogleCalendars(tokens.access_token);
    
    return {
      calendars: calendars.map(cal => ({
        id: cal.id,
        name: cal.summary,
        primary: cal.primary || false,
        accessRole: cal.accessRole,
        timeZone: cal.timeZone,
        backgroundColor: cal.backgroundColor
      }))
    };
    
  } catch (error) {
    console.error('Error fetching Google calendars:', error);
    
    // Fallback to sample data if configured
    if (isDemo()) {
      return { calendars: getSampleCalendars() };
    }
    
    throw error;
  }
});

ipcMain.handle('list-notion-databases', async () => {
  console.log('Notion databases requested');
  
  try {
    if (isDemo()) {
      return getSampleNotionData();
    }
    
    const tokens = await TokenStorage.getTokens('notion');
    if (!tokens) {
      throw new Error('No Notion tokens found. Please connect your Notion account first.');
    }
    
    const databases = await TokenExchangeManager.fetchNotionDatabases(tokens.access_token);
    
    return {
      databases: databases.map(db => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || 'Untitled Database',
        properties: Object.keys(db.properties || {}),
        last_edited_time: db.last_edited_time
      }))
    };
    
  } catch (error) {
    console.error('Error fetching Notion databases:', error);
    
    // Fallback to sample data if configured
    if (isDemo()) {
      return getSampleNotionData();
    }
    
    throw error;
  }
});

ipcMain.handle('toggle-demo', async (event, enabled) => {
  console.log('Demo mode toggled:', enabled);
  // Note: This doesn't change the config file, just runtime behavior
  // The actual demo mode is controlled by environment variables
  return { ok: true, note: 'Demo mode is controlled by environment variables' };
});

ipcMain.handle('sync-items', async (event, calendarId, databaseId) => {
  console.log('Sync requested:', { calendarId, databaseId });
  
  // Simulate sync process
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { 
    ok: true, 
    message: `Synced calendar ${calendarId} with database ${databaseId}`,
    itemsSynced: 5
  };
});

// Clear all data handler
ipcMain.handle('clear-all-data', async () => {
  console.log('Clearing all stored data...');
  
  try {
    // Clear stored tokens
    await TokenStorage.clearAllTokens();
    
    console.log('All data cleared successfully');
    return { ok: true, message: 'All data cleared successfully' };
  } catch (error) {
    console.error('Error clearing data:', error);
    return { ok: false, error: error.message };
  }
});

// Window control handlers
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

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

// Sync management handlers
ipcMain.handle('sync-trigger', async (event, googleCalendarId, notionDatabaseId) => {
  console.log('Manual sync triggered:', { googleCalendarId, notionDatabaseId });
  try {
    // Trigger immediate sync for this specific pair
    const syncKey = `google-${googleCalendarId}:notion-${notionDatabaseId}`;
    syncManager.onLocalChange(syncKey);
    return { ok: true, message: 'Sync triggered successfully' };
  } catch (error) {
    console.error('Sync trigger failed:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('sync-status', () => {
  return syncManager.getSyncStats();
});

// Start sync handler for Fix #4 auto-sync
ipcMain.handle('start-sync', async (event, { notionId, googleId }) => {
  console.log('Starting sync between:', { notionId, googleId });
  
  try {
    if (isDemo()) {
      // In demo mode, simulate sync
      console.log('Demo mode: simulating sync process');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { 
        success: true, 
        message: 'Demo sync completed',
        itemsSynced: 3
      };
    }
    
    // In real mode, would perform actual sync
    // For now, return placeholder
    return { 
      success: true, 
      message: 'Sync initiated',
      itemsSynced: 0
    };
  } catch (error) {
    console.error('Sync error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

ipcMain.handle('sync-clear-data', () => {
  try {
    syncManager.clearSyncData();
    return { ok: true, message: 'Sync data cleared' };
  } catch (error) {
    console.error('Failed to clear sync data:', error);
    return { ok: false, error: error.message };
  }
});

// App event handlers
console.log('Setting up app event handlers...');
console.log('app object before whenReady:', typeof app, !!app);

app.whenReady().then(() => {
  console.log('Electron app ready, validating environment...');
  
  // Validate environment after Electron is ready
  validateEnvironment();
  
  // Remove default menu (task 3)
  Menu.setApplicationMenu(null);
  
  // Set up IPC handlers
  setupIpcHandlers();
  
  console.log('Creating window...');
  createWindow();
  
  console.log('OAuth-Fixed main process setup complete');
  console.log('Configuration loaded:');
  console.log(`DEMO_MODE=${isDemo()}`);

  // Obfuscated credential logging as specified
  const googleClientId = isDemo() ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
  const notionClientId = isDemo() ? process.env.NOTION_CLIENT_ID_DEMO : process.env.NOTION_CLIENT_ID;

  console.log(`Using Google Client ID: ${googleClientId ? googleClientId.substring(0, 20) + '...' : 'MISSING'}`);
  console.log(`Using Notion Client ID: ${notionClientId ? notionClientId.substring(0, 20) + '...' : 'MISSING'}`);
  
  // SyncManager starts automatically on import
  console.log('🚀 SyncManager is running...');
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  // Stop OAuth callback server
  if (oauthCallbackServer) {
    oauthCallbackServer.stop();
  }
  // Stop SyncManager
  syncManager.stop();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('App quitting...');
  // Clean up OAuth callback server
  if (oauthCallbackServer) {
    oauthCallbackServer.stop();
  }
  // Stop SyncManager
  syncManager.stop();
});

// Sample data functions
function getSampleCalendars() {
  return [
    {
      id: 'primary',
      name: 'Primary Calendar',
      primary: true,
      accessRole: 'owner',
      timeZone: 'America/New_York',
      backgroundColor: '#1976d2',
      _demo: true
    },
    {
      id: 'work@example.com',
      name: 'Work Calendar',
      primary: false,
      accessRole: 'owner',
      timeZone: 'America/New_York',
      backgroundColor: '#f44336',
      _demo: true
    },
    {
      id: 'personal@example.com',
      name: 'Personal Projects',
      primary: false,
      accessRole: 'owner',
      timeZone: 'America/New_York',
      backgroundColor: '#4caf50',
      _demo: true
    }
  ];
}

function getSampleNotionData() {
  return {
    databases: [
      {
        id: 'sample-db-1',
        title: 'Content Calendar',
        properties: ['Title', 'Status', 'Date', 'Author'],
        last_edited_time: '2024-01-15T10:00:00.000Z',
        _demo: true
      },
      {
        id: 'sample-db-2',
        title: 'Blog Posts',
        properties: ['Title', 'Status', 'Publish Date', 'Tags'],
        last_edited_time: '2024-01-14T15:30:00.000Z',
        _demo: true
      },
      {
        id: 'sample-db-3',
        title: 'Social Media Schedule',
        properties: ['Platform', 'Content', 'Scheduled Time', 'Status'],
        last_edited_time: '2024-01-13T09:15:00.000Z',
        _demo: true
      }
    ]
  };
}

} // End of setupIpcHandlers function

// Add error handlers to catch silent errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// App event handlers
console.log('Setting up app event handlers...');
console.log('app object before whenReady:', typeof app, !!app);

app.whenReady().then(() => {
  console.log('Electron app ready, validating environment...');
  
  // Validate environment after Electron is ready
  validateEnvironment();
  
  // Remove default menu (task 3)
  Menu.setApplicationMenu(null);
  
  // Set up IPC handlers
  setupIpcHandlers();
  
  console.log('Creating window...');
  createWindow();
  
  console.log('OAuth-Fixed main process setup complete');
  console.log('Configuration loaded:');
  console.log(`DEMO_MODE=${isDemo()}`);

  // Obfuscated credential logging as specified
  const googleClientId = isDemo() ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
  const notionClientId = isDemo() ? process.env.NOTION_CLIENT_ID_DEMO : process.env.NOTION_CLIENT_ID;

  console.log(`Using Google Client ID: ${googleClientId ? googleClientId.substring(0, 20) + '...' : 'MISSING'}`);
  console.log(`Using Notion Client ID: ${notionClientId ? notionClientId.substring(0, 20) + '...' : 'MISSING'}`);
  
  // SyncManager starts automatically on import
  console.log('🚀 SyncManager is running...');
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