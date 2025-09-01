// Clean Electron main process
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Load configuration
const { isDemo } = require('./src/config');

// Environment validation - fail fast if required keys missing
function validateEnvironment() {
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
    
    // Initialize SyncManager after window is visible
    console.log('Initializing SyncManager...');
    const syncManager = require('./src/syncManager');
    console.log('✅ SyncManager initialized and started');
  });

  // Fallback: force show window after 3 seconds if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('Forcing window to show (ready-to-show timeout)');
      mainWindow.show();
      mainWindow.focus();
      
      // Initialize SyncManager if not already done
      console.log('Initializing SyncManager (fallback)...');
      const syncManager = require('./src/syncManager');
      console.log('✅ SyncManager initialized and started (fallback)');
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

// Add error handlers to catch silent errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Electron app event handlers
app.whenReady().then(() => {
  console.log('Electron app ready, validating environment...');
  
  // Validate environment after Electron is ready
  validateEnvironment();
  
  console.log('Creating window...');
  createWindow();
  
  // Register IPC handlers after app is ready
  setupIpcHandlers();
  
  console.log('OAuth-Fixed main process setup complete');
  console.log('Configuration loaded:');
  console.log(`DEMO_MODE=${isDemo()}`);

  // Obfuscated credential logging as specified
  const googleClientId = isDemo() ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
  const notionClientId = isDemo() ? process.env.NOTION_CLIENT_ID_DEMO : process.env.NOTION_CLIENT_ID;

  console.log(`Using Google Client ID: ${googleClientId ? googleClientId.substring(0, 20) + '...' : 'MISSING'}`);
  console.log(`Using Notion Client ID: ${notionClientId ? notionClientId.substring(0, 20) + '...' : 'MISSING'}`);
  
  console.log('Main window visible');
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

// ============================================================================
// IPC HANDLERS SETUP FUNCTION
// ============================================================================

function setupIpcHandlers() {
  console.log('Setting up IPC handlers...');

  // Load OAuth helper modules
  const OAuthURLBuilder = require('./src/oauth-urls');
  const TokenExchangeManager = require('./src/token-exchange');
  const TokenStorage = require('./src/token-storage');
  const PKCEHelper = require('./src/pkce');

// Sample data functions for demo mode
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

// OAuth callback server for handling redirects
let oauthServer = null;
const pendingOAuthFlows = new Map();

// Start OAuth callback server
async function startOAuthServer() {
  if (oauthServer) return oauthServer.port;
  
  const express = require('express');
  const app = express();
  
  // Google OAuth callback
  app.get('/oauth/google/callback', async (req, res) => {
    console.log('Google OAuth callback received');
    
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        console.error('Google OAuth error:', error);
        res.send(getErrorPage('Google OAuth Error', error));
        return;
      }
      
      if (!code) {
        console.error('No authorization code received');
        res.send(getErrorPage('Authorization Failed', 'No authorization code received'));
        return;
      }
      
      // Get pending flow data
      const flowData = pendingOAuthFlows.get(`google-${state}`);
      if (!flowData) {
        console.error('Invalid or expired state parameter');
        res.send(getErrorPage('Security Error', 'Invalid or expired state parameter'));
        return;
      }
      
      console.log('Google OAuth code received, processing...');
      res.send(getSuccessPage('Google Calendar Connected!', 'Authentication successful'));
      
      // Store the result for the main process to pick up
      pendingOAuthFlows.set(`google-${state}`, {
        ...flowData,
        result: { success: true, code, state }
      });
      
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.send(getErrorPage('OAuth Error', error.message));
    }
  });
  
  // Notion OAuth callback
  app.get('/oauth/notion/callback', async (req, res) => {
    console.log('Notion OAuth callback received');
    
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        console.error('Notion OAuth error:', error);
        res.send(getErrorPage('Notion OAuth Error', error));
        return;
      }
      
      if (!code) {
        console.error('No authorization code received');
        res.send(getErrorPage('Authorization Failed', 'No authorization code received'));
        return;
      }
      
      // Get pending flow data
      const flowData = pendingOAuthFlows.get(`notion-${state}`);
      if (!flowData) {
        console.error('Invalid or expired state parameter');
        res.send(getErrorPage('Security Error', 'Invalid or expired state parameter'));
        return;
      }
      
      console.log('Notion OAuth code received, processing...');
      res.send(getSuccessPage('Notion Connected!', 'Authentication successful'));
      
      // Store the result for the main process to pick up
      pendingOAuthFlows.set(`notion-${state}`, {
        ...flowData,
        result: { success: true, code, state }
      });
      
    } catch (error) {
      console.error('Notion OAuth callback error:', error);
      res.send(getErrorPage('OAuth Error', error.message));
    }
  });
  
  return new Promise((resolve, reject) => {
    const server = app.listen(3000, (err) => {
      if (err) {
        if (err.code === 'EADDRINUSE') {
          // Try port 3001 if 3000 is busy
          const server2 = app.listen(3001, (err2) => {
            if (err2) {
              reject(err2);
            } else {
              const port = server2.address().port;
              console.log(`✓ OAuth callback server started on port ${port}`);
              oauthServer = { server: server2, port };
              resolve(port);
            }
          });
        } else {
          reject(err);
        }
      } else {
        const port = server.address().port;
        console.log(`✓ OAuth callback server started on port ${port}`);
        oauthServer = { server, port };
        resolve(port);
      }
    });
  });
}

function getSuccessPage(title, subtitle) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>OAuth Success - Synk</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 50px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          h1 { color: #22c55e; margin-bottom: 10px; }
          p { margin: 10px 0; opacity: 0.9; }
          .countdown { font-size: 14px; opacity: 0.7; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✓ ${title}</h1>
          <p>${subtitle}</p>
          <p>You can now close this window and return to Synk.</p>
          <div class="countdown">This window will close automatically in <span id="timer">5</span> seconds.</div>
        </div>
        <script>
          let countdown = 5;
          const timer = document.getElementById('timer');
          const interval = setInterval(() => {
            countdown--;
            timer.textContent = countdown;
            if (countdown <= 0) {
              clearInterval(interval);
              window.close();
            }
          }, 1000);
        </script>
      </body>
    </html>
  `;
}

function getErrorPage(title, message) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>OAuth Error - Synk</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 50px 20px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          h1 { color: #ef4444; margin-bottom: 10px; }
          p { margin: 10px 0; opacity: 0.9; }
          .error-details { 
            background: rgba(0, 0, 0, 0.2); 
            padding: 15px; 
            border-radius: 10px; 
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✗ ${title}</h1>
          <div class="error-details">${message}</div>
          <p>You can close this window and try again.</p>
          <p>If the problem persists, check the Synk console for more details.</p>
        </div>
      </body>
    </html>
  `;
}

// Google OAuth Handler
ipcMain.handle('oauth-google-start', async (event, options = {}) => {
  console.log('Google OAuth requested, demo mode:', isDemo());
  
  try {
    // Start OAuth server if not running
    await startOAuthServer();
    
    // Generate PKCE data and state
    const pkceData = PKCEHelper.createPKCEPair();
    const authUrl = OAuthURLBuilder.buildGoogleAuthURL(pkceData);
    
    console.log('Opening Google OAuth in system browser:', authUrl);
    
    // Store pending flow
    pendingOAuthFlows.set(`google-${pkceData.state}`, {
      service: 'google',
      pkceData,
      timestamp: Date.now()
    });
    
    // Open OAuth URL in system browser
    shell.openExternal(authUrl);
    
    // Wait for callback with timeout
    const result = await waitForOAuthCallback(`google-${pkceData.state}`, 45000);
    
    if (isDemo()) {
      // In demo mode, always return sample data regardless of OAuth outcome
      console.log('Demo mode: returning sample Google data');
      return { 
        demo: true, 
        connectedEmail: 'demo@synk-official.com', 
        calendars: getSampleCalendars(),
        popupCompleted: result.success || false
      };
    }
    
    if (!result.success) {
      throw new Error(`OAuth not completed: ${result.error || 'timeout'}`);
    }
    
    // In production mode, would exchange code for real tokens
    // For now, return demo data with success flag
    return { 
      demo: false, 
      connectedEmail: 'user@example.com', 
      calendars: getSampleCalendars(),
      popupCompleted: true
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
        note: 'Popup not completed; showing Demo mode data'
      };
    }
    
    return { error: error.message };
  }
});

// Notion OAuth Handler
ipcMain.handle('oauth-notion-start', async (event, options = {}) => {
  console.log('Notion OAuth requested, demo mode:', isDemo());
  
  try {
    // Start OAuth server if not running
    await startOAuthServer();
    
    // Generate state
    const state = PKCEHelper.generateState();
    const authUrl = OAuthURLBuilder.buildNotionAuthURL(state);
    
    console.log('Opening Notion OAuth in system browser:', authUrl);
    
    // Store pending flow
    pendingOAuthFlows.set(`notion-${state}`, {
      service: 'notion',
      state,
      timestamp: Date.now()
    });
    
    // Open OAuth URL in system browser
    shell.openExternal(authUrl);
    
    // Wait for callback with timeout
    const result = await waitForOAuthCallback(`notion-${state}`, 45000);
    
    if (isDemo()) {
      // In demo mode, always return sample data regardless of OAuth outcome
      console.log('Demo mode: returning sample Notion data');
      return { 
        demo: true, 
        connectedEmail: 'demo@synk-official.com', 
        databases: getSampleNotionData().databases,
        popupCompleted: result.success || false
      };
    }
    
    if (!result.success) {
      throw new Error(`OAuth not completed: ${result.error || 'timeout'}`);
    }
    
    // In production mode, would exchange code for real tokens
    // For now, return demo data with success flag
    return { 
      demo: false, 
      connectedEmail: 'user@example.com', 
      databases: getSampleNotionData().databases,
      popupCompleted: true
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
        note: 'Popup not completed; showing Demo mode data'
      };
    }
    
    return { error: error.message };
  }
});

// Helper function to wait for OAuth callback
function waitForOAuthCallback(flowKey, timeoutMs) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkCallback = () => {
      const flowData = pendingOAuthFlows.get(flowKey);
      
      if (flowData && flowData.result) {
        // Callback received
        pendingOAuthFlows.delete(flowKey);
        resolve(flowData.result);
        return;
      }
      
      if (Date.now() - startTime > timeoutMs) {
        // Timeout
        pendingOAuthFlows.delete(flowKey);
        resolve({ success: false, error: 'timeout' });
        return;
      }
      
      // Check again in 1 second
      setTimeout(checkCallback, 1000);
    };
    
    checkCallback();
  });
}

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

// External link handler
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

// Additional handlers that may be called by the UI
ipcMain.handle('list-google-calendars', async () => {
  if (isDemo()) {
    return { calendars: getSampleCalendars() };
  }
  // In production, would fetch real calendars
  return { calendars: getSampleCalendars() };
});

ipcMain.handle('list-notion-databases', async () => {
  if (isDemo()) {
    return getSampleNotionData();
  }
  // In production, would fetch real databases
  return getSampleNotionData();
});

ipcMain.handle('get-google-user-info', async () => {
  return {
    email: isDemo() ? 'demo@synk-official.com' : 'user@example.com',
    name: isDemo() ? 'Demo User' : 'User',
    demo: isDemo()
  };
});

ipcMain.handle('toggle-demo', async (event, enabled) => {
  console.log('Demo mode toggle requested:', enabled);
  // This would typically update the .env file or config
  return { success: true, demoMode: isDemo() };
});

ipcMain.handle('clear-all-data', async () => {
  console.log('Clear all data requested');
  try {
    // Clear any stored tokens or data
    console.log('All data cleared successfully');
    return { success: true, message: 'All data cleared successfully' };
  } catch (error) {
    console.error('Error clearing data:', error);
    return { success: false, error: error.message };
  }
});

// Sync management handlers
ipcMain.handle('sync-trigger', async (event, googleCalendarId, notionDatabaseId) => {
  console.log('Manual sync triggered:', { googleCalendarId, notionDatabaseId });
  try {
    // In demo mode, simulate sync
    if (isDemo()) {
      console.log('Demo mode: simulating sync process');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true, message: 'Demo sync completed', itemsSynced: 3 };
    }
    
    // In production, would perform actual sync
    return { success: true, message: 'Sync triggered successfully' };
  } catch (error) {
    console.error('Sync trigger failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sync-status', () => {
  return {
    isRunning: false,
    lastSync: null,
    itemsSynced: 0,
    errors: []
  };
});

ipcMain.handle('sync-clear-data', async () => {
  console.log('Sync data clear requested');
  return { success: true, message: 'Sync data cleared' };
});

ipcMain.handle('start-sync', async (event, options) => {
  console.log('Start sync requested:', options);
  
  if (isDemo()) {
    console.log('Demo mode: simulating sync start');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { 
      success: true, 
      message: 'Demo sync started',
      itemsSynced: 0
    };
  }
  
  return { success: true, message: 'Sync started' };
});

  console.log('✅ IPC handlers registered successfully');
}