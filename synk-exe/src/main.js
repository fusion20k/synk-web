const { app, BrowserWindow, Tray, Menu, ipcMain, shell, dialog, nativeImage } = require('electron');
const Store = require('electron-store');
const path = require('path');
const axios = require('axios');
const chokidar = require('chokidar');

// Initialize secure storage
const store = new Store({
  encryptionKey: 'synk-secure-key-2024'
});

let mainWindow;
let tray;
let isQuitting = false;
let syncWatcher = null;
let syncPaused = false;

// API Configuration
const API_BASE = 'http://localhost:3000';

class SynkDesktopApp {
  constructor() {
    this.isConnected = {
      notion: false,
      google: false
    };
    this.syncLog = [];
    this.init();
  }

  async init() {
    await this.createWindow();
    this.createTray();
    this.setupIPC();
    await this.checkConnections();
    this.startInstantSync();
  }

  async createWindow() {
    mainWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../assets/icon.ico'),
      titleBarStyle: 'default',
      backgroundColor: '#000000',
      show: false,
      frame: true,
      autoHideMenuBar: true,
      webSecurity: false
    });

    // Load the main UI
    await mainWindow.loadFile('src/renderer/index.html');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      this.addLog('info', 'Synk desktop app initialized');
    });

    // Handle window close - minimize to tray instead
    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow.hide();
        this.addLog('info', 'App minimized to system tray');
        
        // Show tray notification
        if (tray) {
          tray.displayBalloon({
            iconType: 'info',
            title: 'Synk',
            content: 'Synk is running in the background. Right-click the tray icon to access options.'
          });
        }
      }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  createTray() {
    // Create tray icon
    const iconPath = path.join(__dirname, '../assets/tray-icon.png');
    let trayIcon;
    
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
      if (trayIcon.isEmpty()) {
        // Fallback to a simple icon
        trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      }
    } catch (error) {
      // Create a simple fallback icon
      trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    }

    tray = new Tray(trayIcon);
    this.updateTrayMenu();

    tray.setToolTip('Synk - Notion ↔ Google Calendar Sync');

    // Double-click to open
    tray.on('double-click', () => {
      this.showWindow();
    });
  }

  updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Synk',
        click: () => {
          this.showWindow();
        }
      },
      {
        label: syncPaused ? 'Resume Sync' : 'Pause Sync',
        click: () => {
          this.toggleSync();
        }
      },
      { type: 'separator' },
      {
        label: 'Exit',
        click: () => {
          this.quitApp();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
  }

  showWindow() {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      this.createWindow();
    }
  }

  toggleSync() {
    syncPaused = !syncPaused;
    this.updateTrayMenu();
    
    if (syncPaused) {
      this.addLog('warning', 'Sync paused by user');
      if (syncWatcher) {
        clearInterval(syncWatcher);
        syncWatcher = null;
      }
    } else {
      this.addLog('info', 'Sync resumed by user');
      this.startInstantSync();
    }

    // Notify renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('sync-status-changed', { paused: syncPaused });
    }
  }

  quitApp() {
    isQuitting = true;
    if (syncWatcher) {
      clearInterval(syncWatcher);
    }
    app.quit();
  }

  setupIPC() {
    // Handle API requests from renderer
    ipcMain.handle('api-request', async (event, { method, endpoint, body }) => {
      try {
        const response = await axios({
          method,
          url: `${API_BASE}${endpoint}`,
          data: body,
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        return { ok: true, status: response.status, data: response.data };
      } catch (error) {
        return { 
          ok: false, 
          status: error.response?.status || 0, 
          data: { error: error.message } 
        };
      }
    });

    // Handle external links
    ipcMain.handle('open-external', (event, url) => {
      shell.openExternal(url);
    });

    // Get app settings
    ipcMain.handle('get-settings', () => {
      return {
        launchOnStartup: store.get('launchOnStartup', false),
        notificationsEnabled: store.get('notificationsEnabled', true),
        connections: {
          notion: this.isConnected.notion,
          google: this.isConnected.google
        },
        syncPaused: syncPaused
      };
    });

    // Save app settings
    ipcMain.handle('save-settings', (event, settings) => {
      store.set('launchOnStartup', settings.launchOnStartup);
      store.set('notificationsEnabled', settings.notificationsEnabled);
      
      // Handle launch on startup
      app.setLoginItemSettings({
        openAtLogin: settings.launchOnStartup
      });
      
      this.addLog('info', 'Settings saved');
      return true;
    });

    // Get sync log
    ipcMain.handle('get-sync-log', () => {
      return this.syncLog.slice(-20); // Last 20 entries
    });

    // Force sync
    ipcMain.handle('force-sync', async () => {
      return await this.forceSyncNow();
    });

    // Connect services
    ipcMain.handle('connect-notion', async (event, dbId) => {
      return await this.connectNotion(dbId);
    });

    ipcMain.handle('connect-google', async () => {
      return await this.connectGoogle();
    });

    // Toggle sync pause
    ipcMain.handle('toggle-sync', () => {
      this.toggleSync();
      return { paused: syncPaused };
    });
  }

  async checkConnections() {
    try {
      // Check if main server is running
      const healthResponse = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
      if (healthResponse.status !== 200) {
        this.addLog('error', 'Cannot connect to Synk server. Make sure it\'s running on port 3000.');
        return;
      }

      // Check Notion connection
      try {
        const notionResponse = await axios.get(`${API_BASE}/debug/notion`, { timeout: 5000 });
        this.isConnected.notion = notionResponse.data.success;
        if (this.isConnected.notion) {
          this.addLog('success', 'Notion connection verified');
        }
      } catch (error) {
        this.isConnected.notion = false;
        this.addLog('warning', 'Notion not connected');
      }

      // Check Google connection
      try {
        const googleResponse = await axios.get(`${API_BASE}/user/status`, { timeout: 5000 });
        this.isConnected.google = googleResponse.data.user?.google_access_token ? true : false;
        if (this.isConnected.google) {
          this.addLog('success', 'Google Calendar connection verified');
        }
      } catch (error) {
        this.isConnected.google = false;
        this.addLog('warning', 'Google Calendar not connected');
      }

      // Notify renderer of connection status
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('connections-updated', {
          notion: this.isConnected.notion,
          google: this.isConnected.google
        });
      }

    } catch (error) {
      this.addLog('error', `Connection check failed: ${error.message}`);
    }
  }

  async connectNotion(dbId) {
    try {
      // Store database ID
      store.set('notion_db_id', dbId);
      
      // Test connection
      const response = await axios.get(`${API_BASE}/debug/notion`, { timeout: 10000 });
      if (response.data.success) {
        this.isConnected.notion = true;
        this.addLog('success', 'Notion connected successfully');
        return { success: true };
      } else {
        this.addLog('error', 'Failed to connect to Notion');
        return { success: false, error: 'Connection failed' };
      }
    } catch (error) {
      this.addLog('error', `Notion connection failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async connectGoogle() {
    try {
      // Create user if needed
      const userResponse = await axios.post(`${API_BASE}/user/setup`, {}, { timeout: 10000 });
      const userId = userResponse.data.user.id;
      
      // Open OAuth flow
      const authUrl = `${API_BASE}/auth/google?userId=${userId}`;
      await shell.openExternal(authUrl);
      
      this.addLog('info', 'Google OAuth opened in browser');
      
      // Check connection after delay
      setTimeout(async () => {
        await this.checkConnections();
      }, 10000);
      
      return { success: true };
    } catch (error) {
      this.addLog('error', `Google connection failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async forceSyncNow() {
    if (!this.isConnected.notion || !this.isConnected.google) {
      this.addLog('warning', 'Both services must be connected to sync');
      return { success: false, error: 'Services not connected' };
    }

    if (syncPaused) {
      this.addLog('warning', 'Sync is paused');
      return { success: false, error: 'Sync is paused' };
    }

    try {
      this.addLog('info', 'Starting manual sync...');
      const response = await axios.post(`${API_BASE}/sync/trigger`, {}, { timeout: 30000 });
      
      if (response.status === 200) {
        this.addLog('success', 'Manual sync completed successfully');
        return { success: true };
      } else {
        this.addLog('error', 'Manual sync failed');
        return { success: false, error: 'Sync failed' };
      }
    } catch (error) {
      this.addLog('error', `Manual sync failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  startInstantSync() {
    if (syncPaused || !this.isConnected.notion || !this.isConnected.google) {
      return;
    }

    // Clear existing watcher
    if (syncWatcher) {
      clearInterval(syncWatcher);
    }

    // Instant sync - check for changes every 10 seconds
    this.syncWatcher = setInterval(async () => {
      if (!syncPaused && this.isConnected.notion && this.isConnected.google) {
        try {
          // Check for changes and sync if needed
          const response = await axios.post(`${API_BASE}/sync/check-and-sync`, {}, { timeout: 15000 });
          if (response.data.synced && response.data.changes > 0) {
            this.addLog('success', `Auto-sync: ${response.data.changes} changes synced`);
            
            // Show tray notification for successful sync
            if (tray && store.get('notificationsEnabled', true)) {
              tray.displayBalloon({
                iconType: 'info',
                title: 'Synk',
                content: `Auto-sync: ${response.data.changes} changes synced`
              });
            }
          }
        } catch (error) {
          // Silent fail for auto-sync to avoid spam
          if (error.code !== 'ECONNREFUSED') {
            this.addLog('warning', `Auto-sync check failed: ${error.message}`);
          }
        }
      }
    }, 10000); // Check every 10 seconds for instant sync

    this.addLog('info', 'Instant sync monitoring started (10-second intervals)');
  }

  addLog(type, message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message
    };
    
    this.syncLog.push(logEntry);
    
    // Keep only last 100 entries
    if (this.syncLog.length > 100) {
      this.syncLog = this.syncLog.slice(-100);
    }

    // Notify renderer if window is open
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-updated', logEntry);
    }

    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// App event handlers
app.whenReady().then(() => {
  new SynkDesktopApp();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      new SynkDesktopApp();
    }
  });
});

app.on('window-all-closed', () => {
  // Keep app running in background on Windows
  if (process.platform !== 'darwin') {
    // Don't quit, just hide to tray
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}