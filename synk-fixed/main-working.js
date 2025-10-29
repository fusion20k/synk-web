// Working Electron main process
const path = require('path');

// Try to load Electron properly
let app, BrowserWindow, ipcMain, shell;

try {
  // Method 1: Direct destructuring
  ({ app, BrowserWindow, ipcMain, shell } = require('electron'));
  
  // Verify we got the right objects
  if (!app || !app.whenReady || typeof app.whenReady !== 'function') {
    throw new Error('Invalid app object');
  }
  
  console.log('✓ Electron loaded successfully');
} catch (error) {
  console.error('✗ Failed to load Electron:', error.message);
  
  try {
    // Method 2: Alternative loading
    const electronPath = require.resolve('electron');
    console.log('Electron path:', electronPath);
    
    // Try loading from the actual module
    const electron = require(path.dirname(electronPath));
    ({ app, BrowserWindow, ipcMain, shell } = electron);
    
    if (!app || !app.whenReady) {
      throw new Error('Still invalid');
    }
    
    console.log('✓ Electron loaded via alternative method');
  } catch (error2) {
    console.error('✗ Alternative loading failed:', error2.message);
    process.exit(1);
  }
}

// Load other dependencies
const Store = require('electron-store');
require('dotenv').config();

const store = new Store();
let mainWindow;

function createWindow() {
  console.log('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'preload.js')
    },
    backgroundColor: '#000000',
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.ico')
  });

  // Load the HTML file
  const htmlPath = path.join(__dirname, 'src', 'index.html');
  console.log('Loading HTML from:', htmlPath);
  
  mainWindow.loadFile(htmlPath);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready, showing...');
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// OAuth Helper Functions
function createOAuthWindow(url, title) {
  const authWindow = new BrowserWindow({
    width: 500,
    height: 700,
    show: false,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    title: title
  });

  authWindow.loadURL(url);
  authWindow.show();

  return new Promise((resolve, reject) => {
    authWindow.webContents.on('will-redirect', (event, navigationUrl) => {
      const urlObj = new URL(navigationUrl);
      
      if (urlObj.hostname === 'localhost' || urlObj.searchParams.has('code')) {
        authWindow.close();
        resolve(navigationUrl);
      }
    });

    authWindow.on('closed', () => {
      reject(new Error('OAuth window was closed by user'));
    });
  });
}

function getGoogleAuthURL() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = 'http://localhost:3000/auth/google/callback';
  const scope = 'https://www.googleapis.com/auth/calendar';
  
  return `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent`;
}

function getNotionAuthURL() {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = 'http://localhost:3000/auth/notion/callback';
  
  return `https://api.notion.com/v1/oauth/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `owner=user&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`;
}

// IPC Handlers for the renderer process
ipcMain.handle('oauth-google-start', async (event, { demoMode }) => {
  console.log('Google OAuth requested, demo mode:', demoMode);
  
  try {
    const authUrl = getGoogleAuthURL();
    console.log('Opening Google OAuth in system browser:', authUrl);
    
    // ALWAYS open the OAuth popup - even in demo mode
    shell.openExternal(authUrl);
    
    // Start loopback server to catch callback
    const { startLoopback, awaitCode } = buildGoogleAuth();
    const stopLoopback = startLoopback();
    
    let outcome = { ok: false, reason: 'timeout' };
    
    try {
      // Wait for OAuth callback with timeout
      const code = await awaitCode({ timeoutMs: 45000 });
      outcome = { ok: true, code };
      console.log('OAuth callback received with code');
    } catch (error) {
      outcome = { ok: false, reason: error.message || 'timeout' };
      console.log('OAuth failed or timed out:', error.message);
    } finally {
      stopLoopback();
    }
    
    if (demoMode) {
      // In demo mode, always return sample data regardless of OAuth outcome
      console.log('Demo mode: returning sample data');
      return { 
        demo: true, 
        connectedEmail: 'demo@synk-official.com', 
        calendars: getSampleCalendars(),
        popupCompleted: outcome.ok
      };
    }
    
    if (!outcome.ok) {
      throw new Error(`OAuth not completed: ${outcome.reason}`);
    }
    
    // Real mode: exchange code for tokens
    const tokens = await exchangeGoogleCode(outcome.code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    const calendars = await fetchCalendarList(tokens.access_token);
    saveTokensSecure('google', tokens);
    
    return { 
      demo: false, 
      connectedEmail: profile.email, 
      calendars,
      popupCompleted: true
    };
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    
    if (demoMode) {
      // Even if OAuth fails in demo mode, show sample data
      return { 
        demo: true, 
        connectedEmail: 'demo@synk-official.com', 
        calendars: getSampleCalendars(),
        popupCompleted: false,
        note: 'Popup not completed; showing Demo mode data'
      };
    }
    
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('oauth-notion-start', async (event, { demoMode }) => {
  console.log('Notion OAuth requested, demo mode:', demoMode);
  
  try {
    const authUrl = getNotionAuthURL();
    console.log('Opening Notion OAuth in system browser:', authUrl);
    
    // ALWAYS open the OAuth popup - even in demo mode
    shell.openExternal(authUrl);
    
    // Start loopback server to catch callback
    const { startLoopback, awaitCode } = buildNotionAuth();
    const stopLoopback = startLoopback();
    
    let outcome = { ok: false, reason: 'timeout' };
    
    try {
      // Wait for OAuth callback with timeout
      const code = await awaitCode({ timeoutMs: 45000 });
      outcome = { ok: true, code };
      console.log('Notion OAuth callback received with code');
    } catch (error) {
      outcome = { ok: false, reason: error.message || 'timeout' };
      console.log('Notion OAuth failed or timed out:', error.message);
    } finally {
      stopLoopback();
    }
    
    if (demoMode) {
      // In demo mode, always return sample data regardless of OAuth outcome
      console.log('Demo mode: returning sample Notion data');
      return { 
        demo: true, 
        connectedEmail: 'demo@synk-official.com', 
        databases: getSampleNotionData().databases,
        popupCompleted: outcome.ok
      };
    }
    
    if (!outcome.ok) {
      throw new Error(`OAuth not completed: ${outcome.reason}`);
    }
    
    // Real mode: exchange code for tokens
    const tokens = await exchangeNotionCode(outcome.code);
    const databases = await fetchNotionDatabases(tokens.access_token);
    saveTokensSecure('notion', tokens);
    
    return { 
      demo: false, 
      connectedEmail: tokens.owner?.user?.person?.email || 'notion-user@example.com', 
      databases,
      popupCompleted: true
    };
    
  } catch (error) {
    console.error('Notion OAuth error:', error);
    
    if (demoMode) {
      // Even if OAuth fails in demo mode, show sample data
      return { 
        demo: true, 
        connectedEmail: 'demo@synk-official.com', 
        databases: getSampleNotionData().databases,
        popupCompleted: false,
        note: 'Popup not completed; showing Demo mode data'
      };
    }
    
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('list-google-calendars', async () => {
  console.log('Google calendars requested');
  
  // Return sample data for testing
  return {
    calendars: [
      {
        id: 'primary',
        name: 'Primary Calendar',
        primary: true,
        accessRole: 'owner',
        timeZone: 'America/New_York'
      },
      {
        id: 'work',
        name: 'Work Calendar',
        primary: false,
        accessRole: 'owner',
        timeZone: 'America/New_York'
      },
      {
        id: 'personal',
        name: 'Personal Projects',
        primary: false,
        accessRole: 'owner',
        timeZone: 'America/New_York'
      }
    ]
  };
});

ipcMain.handle('list-notion-databases', async () => {
  console.log('Notion databases requested');
  
  // Return sample data for testing
  return {
    databases: [
      {
        id: 'db1',
        title: 'Content Calendar',
        properties: ['Title', 'Status', 'Date', 'Author'],
        last_edited_time: '2024-01-15T10:00:00.000Z'
      },
      {
        id: 'db2',
        title: 'Blog Posts',
        properties: ['Title', 'Status', 'Publish Date', 'Tags'],
        last_edited_time: '2024-01-14T15:30:00.000Z'
      },
      {
        id: 'db3',
        title: 'Social Media Schedule',
        properties: ['Platform', 'Content', 'Scheduled Time', 'Status'],
        last_edited_time: '2024-01-13T09:15:00.000Z'
      }
    ]
  };
});

ipcMain.handle('toggle-demo', async (event, enabled) => {
  console.log('Demo mode toggled:', enabled);
  store.set('demoMode', enabled);
  return { ok: true };
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

// App event handlers
console.log('Setting up app event handlers...');

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('App quitting...');
});

// OAuth Helper Functions
function buildGoogleAuth() {
  const http = require('http');
  let server;
  
  function startLoopback() {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:3000');
      if (url.pathname === '/auth/google/callback') {
        const code = url.searchParams.get('code');
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization successful!</h1><p>You can close this window.</p>');
          server.emit('auth-code', code);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization failed</h1><p>No code received.</p>');
          server.emit('auth-error', new Error('No authorization code'));
        }
      }
    });
    
    server.listen(3000);
    
    return () => {
      if (server) {
        server.close();
      }
    };
  }
  
  function awaitCode({ timeoutMs = 45000 }) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('OAuth timeout'));
      }, timeoutMs);
      
      server.once('auth-code', (code) => {
        clearTimeout(timeout);
        resolve(code);
      });
      
      server.once('auth-error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
  
  return { startLoopback, awaitCode };
}

function buildNotionAuth() {
  const http = require('http');
  let server;
  
  function startLoopback() {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:3000');
      if (url.pathname === '/auth/notion/callback') {
        const code = url.searchParams.get('code');
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization successful!</h1><p>You can close this window.</p>');
          server.emit('auth-code', code);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization failed</h1><p>No code received.</p>');
          server.emit('auth-error', new Error('No authorization code'));
        }
      }
    });
    
    server.listen(3001);
    
    return () => {
      if (server) {
        server.close();
      }
    };
  }
  
  function awaitCode({ timeoutMs = 45000 }) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('OAuth timeout'));
      }, timeoutMs);
      
      server.once('auth-code', (code) => {
        clearTimeout(timeout);
        resolve(code);
      });
      
      server.once('auth-error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
  
  return { startLoopback, awaitCode };
}

// Sample data functions
function getSampleCalendars() {
  return [
    {
      id: 'primary',
      name: 'Primary Calendar',
      primary: true,
      accessRole: 'owner',
      timeZone: 'America/New_York',
      _demo: true
    },
    {
      id: 'work',
      name: 'Work Calendar',
      primary: false,
      accessRole: 'owner',
      timeZone: 'America/New_York',
      _demo: true
    },
    {
      id: 'personal',
      name: 'Personal Projects',
      primary: false,
      accessRole: 'owner',
      timeZone: 'America/New_York',
      _demo: true
    }
  ];
}

function getSampleNotionData() {
  return {
    databases: [
      {
        id: 'db1',
        title: 'Content Calendar',
        properties: ['Title', 'Status', 'Date', 'Author'],
        last_edited_time: '2024-01-15T10:00:00.000Z',
        _demo: true
      },
      {
        id: 'db2',
        title: 'Blog Posts',
        properties: ['Title', 'Status', 'Publish Date', 'Tags'],
        last_edited_time: '2024-01-14T15:30:00.000Z',
        _demo: true
      },
      {
        id: 'db3',
        title: 'Social Media Schedule',
        properties: ['Platform', 'Content', 'Scheduled Time', 'Status'],
        last_edited_time: '2024-01-13T09:15:00.000Z',
        _demo: true
      }
    ]
  };
}

// Placeholder functions for real OAuth (to be implemented)
async function exchangeGoogleCode(code) {
  // TODO: Implement real Google token exchange
  throw new Error('Real Google OAuth not implemented yet');
}

async function fetchGoogleProfile(accessToken) {
  // TODO: Implement real Google profile fetch
  throw new Error('Real Google profile fetch not implemented yet');
}

async function fetchCalendarList(accessToken) {
  // TODO: Implement real Google calendar list fetch
  throw new Error('Real Google calendar fetch not implemented yet');
}

async function exchangeNotionCode(code) {
  // TODO: Implement real Notion token exchange
  throw new Error('Real Notion OAuth not implemented yet');
}

async function fetchNotionDatabases(accessToken) {
  // TODO: Implement real Notion database fetch
  throw new Error('Real Notion database fetch not implemented yet');
}

function saveTokensSecure(service, tokens) {
  // TODO: Implement secure token storage
  console.log(`Saving ${service} tokens securely`);
}

console.log('Main process setup complete');