const { app, BrowserWindow, Tray, Menu, ipcMain, shell, dialog } = require('electron');
const Store = require('electron-store');
const path = require('path');
const axios = require('axios');
const chokidar = require('chokidar');

// Initialize auto-updater only after app is ready
let autoUpdater;

// Initialize secure storage
const store = new Store({
  encryptionKey: 'synk-secure-key-2024'
});

let mainWindow;
let tray;
let isQuitting = false;
let syncWatcher = null;

// API Configuration
const API_BASE = 'http://localhost:3000';

class SynkApp {
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
    this.setupAutoUpdater();
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
      autoHideMenuBar: true
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
      }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  createTray() {
    // Create system tray icon
    const trayIconPath = path.join(__dirname, '../assets/tray-icon.png');
    tray = new Tray(trayIconPath);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Synk',
        click: () => {
          this.showWindow();
        }
      },
      {
        label: 'Sync Now',
        click: async () => {
          await this.forceSyncNow();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          this.quitApp();
        }
      }
    ]);

    tray.setToolTip('Synk - Notion ↔ Google Calendar Sync');
    tray.setContextMenu(contextMenu);

    // Double-click to open
    tray.on('double-click', () => {
      this.showWindow();
    });
  }

  showWindow() {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      this.createWindow();
    }
  }

  quitApp() {
    isQuitting = true;
    if (syncWatcher) {
      syncWatcher.close();
    }
    app.quit();
  }

  setupAutoUpdater() {
    try {
      // Initialize auto-updater after app is ready
      autoUpdater = require('electron-updater').autoUpdater;
      
      autoUpdater.checkForUpdatesAndNotify();
      
      autoUpdater.on('update-available', () => {
        this.addLog('info', 'Update available - downloading...');
      });

      autoUpdater.on('update-downloaded', () => {
        this.addLog('success', 'Update downloaded - restart to apply');
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Update Ready',
          message: 'Update downloaded. Restart Synk to apply the update.',
          buttons: ['Restart Now', 'Later']
        }).then((result) => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
      });
    } catch (error) {
      console.log('Auto-updater not available in development mode');
      this.addLog('info', 'Auto-updater disabled in development mode');
    }
  }

  setupIPC() {
    // Handle API requests from renderer
    ipcMain.handle('api-request', async (event, { method, endpoint, body }) => {
      try {
        const response = await axios({
          method,
          url: `${API_BASE}${endpoint}`,
          data: body,
          headers: { 'Content-Type': 'application/json' }
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
        }
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
  }

  async checkConnections() {
    try {
      // Check if main server is running
      const healthResponse = await axios.get(`${API_BASE}/health`);
      if (healthResponse.status !== 200) {
        this.addLog('error', 'Cannot connect to Synk server. Make sure it\'s running.');
        return;
      }

      // Check Notion connection
      try {
        const notionResponse = await axios.get(`${API_BASE}/debug/notion`);
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
        const googleResponse = await axios.get(`${API_BASE}/user/status`);
        this.isConnected.google = googleResponse.data.user?.google_access_token ? true : false;
        if (this.isConnected.google) {
          this.addLog('success', 'Google Calendar connection verified');
        }
      } catch (error) {
        this.isConnected.google = false;
        this.addLog('warning', 'Google Calendar not connected');
      }

      // Notify renderer of connection status
      if (mainWindow) {
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
      const response = await axios.get(`${API_BASE}/debug/notion`);
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
      const userResponse = await axios.post(`${API_BASE}/user/setup`);
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

    try {
      this.addLog('info', 'Starting manual sync...');
      const response = await axios.post(`${API_BASE}/sync/trigger`);
      
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
    if (!this.isConnected.notion || !this.isConnected.google) {
      return;
    }

    // Watch for changes in Notion (this would need to be implemented based on Notion's webhook or polling)
    // For now, we'll use a simple polling mechanism every 30 seconds to detect changes
    this.syncWatcher = setInterval(async () => {
      if (this.isConnected.notion && this.isConnected.google) {
        try {
          // Check for changes and sync if needed
          const response = await axios.post(`${API_BASE}/sync/check-and-sync`);
          if (response.data.synced) {
            this.addLog('success', `Auto-sync: ${response.data.changes} changes synced`);
          }
        } catch (error) {
          // Silent fail for auto-sync to avoid spam
        }
      }
    }, 30000); // Check every 30 seconds

    this.addLog('info', 'Instant sync monitoring started');
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
  new SynkApp();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      new SynkApp();
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