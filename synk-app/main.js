// Main Electron process with OAuth integration
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Set default environment if not set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
}

// Load config and OAuth manager
// const config = require('./config');
// const OAuthManager = require('./oauth-manager');

class SynkApp {
    constructor() {
        this.mainWindow = null;
        this.oauthManager = null;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Synk App...');
            
            // Initialize OAuth manager
            this.oauthManager = new OAuthManager();
            await this.oauthManager.initialize();
            
            // Setup IPC handlers
            this.setupIPC();
            
            console.log('✅ Synk App initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Synk App:', error);
            
            // Show error dialog to user
            const { dialog } = require('electron');
            dialog.showErrorBox('OAuth Configuration Error', 
                'OAuth misconfigured: check redirect URIs and client IDs\n\n' + error.message);
            
            app.quit();
        }
    }

    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            },
            icon: path.join(__dirname, 'assets', 'icon.png'),
            titleBarStyle: 'default',
            show: false
        });

        // Load the app
        this.mainWindow.loadFile('index.html');

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            
            if (config.isDevelopment()) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }

    setupIPC() {
        // Handle Google OAuth
        ipcMain.handle('oauth-google', async () => {
            try {
                console.log('📨 IPC: Google OAuth requested');
                const result = await this.oauthManager.authenticateGoogle();
                return { success: true, data: result };
            } catch (error) {
                console.error('❌ IPC: Google OAuth failed:', error);
                return { success: false, error: error.message };
            }
        });

        // Handle Notion OAuth
        ipcMain.handle('oauth-notion', async () => {
            try {
                console.log('📨 IPC: Notion OAuth requested');
                const result = await this.oauthManager.authenticateNotion();
                return { success: true, data: result };
            } catch (error) {
                console.error('❌ IPC: Notion OAuth failed:', error);
                return { success: false, error: error.message };
            }
        });

        // Get app configuration
        ipcMain.handle('get-config', () => {
            return {
                mode: config.get('MODE'),
                demoMode: config.isDemoMode(),
                development: config.isDevelopment()
            };
        });

        // Health check
        ipcMain.handle('health-check', () => {
            return {
                status: 'ok',
                mode: config.get('MODE'),
                demo: config.isDemoMode(),
                timestamp: new Date().toISOString()
            };
        });
    }

    async shutdown() {
        console.log('🛑 Shutting down Synk App...');
        
        if (this.oauthManager) {
            await this.oauthManager.shutdown();
        }
        
        console.log('✅ Synk App shutdown complete');
    }
}

// App event handlers
const synkApp = new SynkApp();

app.whenReady().then(async () => {
    await synkApp.initialize();
    synkApp.createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            synkApp.createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', async () => {
    await synkApp.shutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});