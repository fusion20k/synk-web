// Synk Web Application Logic
class SynkWebApp {
    constructor() {
        this.isConnected = {
            notion: false,
            google: false
        };
        this.syncInterval = null;
        this.autoSyncEnabled = false;
        this.apiBase = 'http://localhost:3000';
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.checkConnections();
        this.updateUI();
        this.addLog('info', 'Web application initialized');
    }

    bindEvents() {
        // Connection buttons
        document.getElementById('connect-notion').addEventListener('click', () => this.connectNotion());
        document.getElementById('connect-google').addEventListener('click', () => this.connectGoogle());
        
        // Sync controls
        document.getElementById('sync-now').addEventListener('click', () => this.syncNow());
        document.getElementById('auto-sync-toggle').addEventListener('change', (e) => this.toggleAutoSync(e.target.checked));
        document.getElementById('sync-interval').addEventListener('change', (e) => this.updateSyncInterval(e.target.value));
        
        // Log controls
        document.getElementById('clear-log').addEventListener('click', () => this.clearLog());
    }

    async apiRequest(method, endpoint, body = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };
            
            if (body) {
                options.body = JSON.stringify(body);
            }
            
            const response = await fetch(`${this.apiBase}${endpoint}`, options);
            const data = await response.json();
            
            return {
                ok: response.ok,
                status: response.status,
                data
            };
        } catch (error) {
            return {
                ok: false,
                status: 0,
                data: { error: error.message }
            };
        }
    }

    async checkConnections() {
        // Check server health first
        try {
            const healthResponse = await this.apiRequest('GET', '/health');
            if (!healthResponse.ok) {
                this.addLog('error', 'Cannot connect to Synk server. Make sure it\'s running on port 3000.');
                return;
            }
            this.addLog('success', 'Connected to Synk server');
        } catch (error) {
            this.addLog('error', 'Server connection failed. Start the server with: npm start');
            return;
        }

        // Check Notion connection
        try {
            const response = await this.apiRequest('GET', '/debug/notion');
            if (response.ok && response.data.success) {
                this.isConnected.notion = true;
                this.updateConnectionStatus('notion', 'connected', 'Connected');
                this.addLog('success', 'Notion connection verified');
            } else {
                this.isConnected.notion = false;
                this.updateConnectionStatus('notion', 'error', 'Disconnected');
                this.addLog('warning', 'Notion not connected');
            }
        } catch (error) {
            this.isConnected.notion = false;
            this.updateConnectionStatus('notion', 'error', 'Error');
            this.addLog('error', `Notion check failed: ${error.message}`);
        }

        // Check Google connection
        try {
            const response = await this.apiRequest('GET', '/user/status');
            if (response.ok && response.data.user && response.data.user.google_access_token) {
                this.isConnected.google = true;
                this.updateConnectionStatus('google', 'connected', 'Connected');
                this.addLog('success', 'Google Calendar connection verified');
            } else {
                this.isConnected.google = false;
                this.updateConnectionStatus('google', 'error', 'Disconnected');
                this.addLog('warning', 'Google Calendar not connected');
            }
        } catch (error) {
            this.isConnected.google = false;
            this.updateConnectionStatus('google', 'error', 'Error');
            this.addLog('error', `Google check failed: ${error.message}`);
        }
    }

    updateConnectionStatus(service, status, text) {
        const statusElement = document.getElementById(`${service}-status`);
        const textElement = document.getElementById(`${service}-text`);
        
        statusElement.className = `status-card ${status}`;
        textElement.textContent = text;
    }

    updateUI() {
        const bothConnected = this.isConnected.notion && this.isConnected.google;
        const syncButton = document.getElementById('sync-now');
        
        syncButton.disabled = !bothConnected;
        
        if (bothConnected) {
            syncButton.classList.add('pulse');
            this.addLog('success', 'Ready to sync! Both services connected.');
        } else {
            syncButton.classList.remove('pulse');
        }
    }

    async connectNotion() {
        const dbId = prompt('Enter your Notion Database ID:');
        if (!dbId) return;
        
        try {
            this.addLog('info', 'Connecting to Notion...');
            
            // For MVP, we'll just store this locally and test the connection
            localStorage.setItem('notion_db_id', dbId);
            
            // Test the connection
            const response = await this.apiRequest('GET', '/debug/notion');
            if (response.ok) {
                this.isConnected.notion = true;
                this.updateConnectionStatus('notion', 'connected', 'Connected');
                this.addLog('success', 'Notion connected successfully');
                this.updateUI();
            } else {
                this.addLog('error', 'Failed to connect to Notion. Check your database ID.');
            }
        } catch (error) {
            this.addLog('error', `Notion connection failed: ${error.message}`);
        }
    }

    async connectGoogle() {
        try {
            this.addLog('info', 'Starting Google OAuth flow...');
            
            // First, ensure we have a user
            const userResponse = await this.apiRequest('POST', '/user/setup');
            
            if (!userResponse.ok) {
                this.addLog('error', 'Failed to create user account. Please check database setup.');
                return;
            }
            
            const userId = userResponse.data.user.id;
            const authUrl = `${this.apiBase}/auth/google?userId=${userId}`;
            
            // Open OAuth in new window
            window.open(authUrl, '_blank', 'width=600,height=600');
            this.addLog('info', 'OAuth window opened. Complete authorization and return here.');
            
            // Check connection status after a delay
            setTimeout(() => {
                this.checkConnections();
            }, 10000);
            
        } catch (error) {
            this.addLog('error', `Failed to start Google OAuth: ${error.message}`);
        }
    }

    async syncNow() {
        if (!this.isConnected.notion || !this.isConnected.google) {
            this.addLog('warning', 'Both Notion and Google Calendar must be connected to sync');
            return;
        }
        
        try {
            this.addLog('info', 'Starting manual sync...');
            const response = await this.apiRequest('POST', '/sync/trigger');
            
            if (response.ok) {
                this.addLog('success', 'Manual sync completed successfully');
                
                // Show browser notification if supported
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Synk', {
                        body: 'Manual sync completed successfully!',
                        icon: '/favicon.ico'
                    });
                }
            } else {
                this.addLog('error', `Sync failed: ${response.data.error || 'Unknown error'}`);
            }
        } catch (error) {
            this.addLog('error', `Sync failed: ${error.message}`);
        }
    }

    async toggleAutoSync(enabled) {
        this.autoSyncEnabled = enabled;
        document.getElementById('sync-interval').disabled = !enabled;
        
        if (enabled) {
            await this.startAutoSync();
            this.addLog('success', 'Auto-sync enabled');
        } else {
            this.stopAutoSync();
            this.addLog('info', 'Auto-sync disabled');
        }
        
        // Save setting to localStorage
        localStorage.setItem('auto_sync_enabled', enabled);
    }

    async startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        const intervalMinutes = parseInt(document.getElementById('sync-interval').value);
        const intervalMs = intervalMinutes * 60 * 1000;
        
        this.syncInterval = setInterval(async () => {
            if (this.isConnected.notion && this.isConnected.google) {
                try {
                    const response = await this.apiRequest('POST', '/sync/trigger');
                    if (response.ok) {
                        this.addLog('success', 'Auto-sync completed');
                    } else {
                        this.addLog('error', `Auto-sync failed: ${response.data.error || 'Unknown error'}`);
                    }
                } catch (error) {
                    this.addLog('error', `Auto-sync failed: ${error.message}`);
                }
            }
        }, intervalMs);
        
        this.addLog('info', `Auto-sync scheduled every ${intervalMinutes} minutes`);
        localStorage.setItem('sync_interval', intervalMinutes);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    updateSyncInterval(minutes) {
        if (this.autoSyncEnabled) {
            this.stopAutoSync();
            this.startAutoSync();
        }
    }

    addLog(type, message) {
        const logContent = document.getElementById('log-content');
        const time = new Date().toLocaleTimeString();
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message">${message}</span>
        `;
        
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
        
        // Keep only last 50 entries
        const entries = logContent.querySelectorAll('.log-entry');
        if (entries.length > 50) {
            entries[0].remove();
        }
    }

    clearLog() {
        const logContent = document.getElementById('log-content');
        logContent.innerHTML = '';
        this.addLog('info', 'Log cleared');
    }

    // Load saved settings on startup
    loadSettings() {
        const autoSyncEnabled = localStorage.getItem('auto_sync_enabled') === 'true';
        const syncInterval = localStorage.getItem('sync_interval') || '30';
        
        document.getElementById('auto-sync-toggle').checked = autoSyncEnabled;
        document.getElementById('sync-interval').value = syncInterval;
        
        if (autoSyncEnabled) {
            this.toggleAutoSync(true);
        }
    }
}

// Tray Simulator Class
class SynkTraySimulator {
    constructor(synkApp) {
        this.synkApp = synkApp;
        this.isMinimized = false;
        this.init();
    }

    init() {
        this.addTrayControls();
        this.setupKeyboardShortcuts();
        this.setupNotifications();
    }

    addTrayControls() {
        // Add a floating control panel
        const trayPanel = document.createElement('div');
        trayPanel.id = 'tray-panel';
        trayPanel.innerHTML = `
            <div class="tray-icon" title="Synk - Click to toggle">
                <span class="tray-letter">S</span>
            </div>
            <div class="tray-menu" id="tray-menu" style="display: none;">
                <div class="tray-menu-item" onclick="window.synkApp.showApp()">Open Synk</div>
                <div class="tray-menu-item" onclick="window.synkApp.syncNow()">Sync Now</div>
                <div class="tray-menu-item" onclick="window.synkApp.toggleMinimize()">Minimize</div>
                <div class="tray-menu-item" onclick="window.close()">Exit</div>
            </div>
        `;
        
        // Add tray styles
        const trayStyles = `
            #tray-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
            }
            
            .tray-icon {
                width: 40px;
                height: 40px;
                background: #000000;
                border: 2px solid #ffffff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
            }
            
            .tray-icon:hover {
                box-shadow: 0 0 25px rgba(255, 255, 255, 0.6);
                transform: scale(1.1);
            }
            
            .tray-letter {
                color: #ffffff;
                font-weight: bold;
                font-size: 18px;
                text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
            }
            
            .tray-menu {
                position: absolute;
                top: 50px;
                right: 0;
                background: rgba(0, 0, 0, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                min-width: 150px;
                backdrop-filter: blur(10px);
            }
            
            .tray-menu-item {
                padding: 12px 16px;
                color: #ffffff;
                cursor: pointer;
                transition: all 0.3s ease;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .tray-menu-item:last-child {
                border-bottom: none;
            }
            
            .tray-menu-item:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #00ff88;
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = trayStyles;
        document.head.appendChild(styleSheet);
        document.body.appendChild(trayPanel);
        
        // Bind events
        document.querySelector('.tray-icon').addEventListener('click', () => {
            this.toggleTrayMenu();
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#tray-panel')) {
                document.getElementById('tray-menu').style.display = 'none';
            }
        });
    }

    toggleTrayMenu() {
        const menu = document.getElementById('tray-menu');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+S to toggle Synk
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                this.toggleMinimize();
            }
            
            // Ctrl+Shift+R to sync
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                this.synkApp.syncNow();
            }
        });
    }

    setupNotifications() {
        // Enhanced notification system
        if ('Notification' in window) {
            Notification.requestPermission();
        }
        
        // Service Worker for background notifications (if supported)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                console.log('Service Worker not available');
            });
        }
    }

    toggleMinimize() {
        const appContainer = document.querySelector('.app-container');
        if (this.isMinimized) {
            appContainer.style.display = 'flex';
            this.isMinimized = false;
            this.synkApp.addLog('info', 'App restored');
        } else {
            appContainer.style.display = 'none';
            this.isMinimized = true;
            this.synkApp.addLog('info', 'App minimized to tray');
            
            // Show notification
            if (Notification.permission === 'granted') {
                new Notification('Synk minimized', {
                    body: 'Synk is running in the background. Use Ctrl+Shift+S to restore.',
                    icon: '/favicon.ico'
                });
            }
        }
    }

    showApp() {
        const appContainer = document.querySelector('.app-container');
        appContainer.style.display = 'flex';
        this.isMinimized = false;
        window.focus();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    window.synkApp = new SynkWebApp();
    
    // Initialize tray simulator
    setTimeout(() => {
        window.synkTray = new SynkTraySimulator(window.synkApp);
        window.synkApp.loadSettings();
    }, 1000);
    
    // Add methods to synkApp for tray integration
    window.synkApp.showApp = function() {
        window.synkTray.showApp();
    };
    
    window.synkApp.toggleMinimize = function() {
        window.synkTray.toggleMinimize();
    };
});