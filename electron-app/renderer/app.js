// Synk Desktop Application Logic
class SynkApp {
    constructor() {
        this.isConnected = {
            notion: false,
            google: false
        };
        this.syncInterval = null;
        this.autoSyncEnabled = false;
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadSettings();
        await this.checkConnections();
        this.updateUI();
        this.addLog('info', 'Application initialized');
    }

    bindEvents() {
        // Connection buttons
        document.getElementById('connect-notion').addEventListener('click', () => this.connectNotion());
        document.getElementById('connect-google').addEventListener('click', () => this.connectGoogle());
        
        // Sync controls
        document.getElementById('sync-now').addEventListener('click', () => this.syncNow());
        document.getElementById('auto-sync-toggle').addEventListener('change', (e) => this.toggleAutoSync(e.target.checked));
        document.getElementById('sync-interval').addEventListener('change', (e) => this.updateSyncInterval(e.target.value));
        
        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        document.getElementById('close-settings').addEventListener('click', () => this.closeSettings());
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
        document.getElementById('reset-connections').addEventListener('click', () => this.resetConnections());
        
        // Connection modal
        document.getElementById('close-connection').addEventListener('click', () => this.closeConnectionModal());
        
        // Log controls
        document.getElementById('clear-log').addEventListener('click', () => this.clearLog());
        
        // Modal overlay clicks
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal') this.closeSettings();
        });
        
        document.getElementById('connection-modal').addEventListener('click', (e) => {
            if (e.target.id === 'connection-modal') this.closeConnectionModal();
        });
    }

    async loadSettings() {
        try {
            const settings = await window.electronAPI.store.get('settings') || {};
            
            // Load auto-sync settings
            this.autoSyncEnabled = settings.autoSync || false;
            const interval = settings.syncInterval || 30;
            
            document.getElementById('auto-sync-toggle').checked = this.autoSyncEnabled;
            document.getElementById('sync-interval').value = interval;
            document.getElementById('sync-interval').disabled = !this.autoSyncEnabled;
            
            // Load other settings
            if (settings.notionDbId) {
                document.getElementById('notion-db-id').value = settings.notionDbId;
            }
            
            document.getElementById('sync-completed-tasks').checked = settings.syncCompletedTasks || false;
            document.getElementById('create-all-day-events').checked = settings.createAllDayEvents !== false;
            
        } catch (error) {
            this.addLog('error', `Failed to load settings: ${error.message}`);
        }
    }

    async saveSettings() {
        try {
            const settings = {
                autoSync: document.getElementById('auto-sync-toggle').checked,
                syncInterval: parseInt(document.getElementById('sync-interval').value),
                notionDbId: document.getElementById('notion-db-id').value,
                syncCompletedTasks: document.getElementById('sync-completed-tasks').checked,
                createAllDayEvents: document.getElementById('create-all-day-events').checked
            };
            
            await window.electronAPI.store.set('settings', settings);
            this.closeSettings();
            this.addLog('success', 'Settings saved successfully');
            
            // Update auto-sync if needed
            if (settings.autoSync !== this.autoSyncEnabled) {
                this.toggleAutoSync(settings.autoSync);
            }
            
        } catch (error) {
            this.addLog('error', `Failed to save settings: ${error.message}`);
        }
    }

    async checkConnections() {
        // Check Notion connection
        try {
            const response = await window.electronAPI.apiRequest('GET', '/debug/notion');
            if (response.ok && response.data.success) {
                this.isConnected.notion = true;
                this.updateConnectionStatus('notion', 'connected', 'Connected');
            } else {
                this.isConnected.notion = false;
                this.updateConnectionStatus('notion', 'error', 'Disconnected');
            }
        } catch (error) {
            this.isConnected.notion = false;
            this.updateConnectionStatus('notion', 'error', 'Error');
        }

        // Check Google connection
        try {
            const response = await window.electronAPI.apiRequest('GET', '/user/status');
            if (response.ok && response.data.user && response.data.user.google_access_token) {
                this.isConnected.google = true;
                this.updateConnectionStatus('google', 'connected', 'Connected');
            } else {
                this.isConnected.google = false;
                this.updateConnectionStatus('google', 'error', 'Disconnected');
            }
        } catch (error) {
            this.isConnected.google = false;
            this.updateConnectionStatus('google', 'error', 'Error');
        }
    }

    updateConnectionStatus(service, status, text) {
        const statusElement = document.getElementById(`${service}-status`);
        const iconElement = document.getElementById(`${service}-icon`);
        const textElement = document.getElementById(`${service}-text`);
        
        statusElement.className = `status-item ${status}`;
        textElement.textContent = text;
        
        if (status === 'connected') {
            iconElement.textContent = '🟢';
        } else if (status === 'error') {
            iconElement.textContent = '🔴';
        } else {
            iconElement.textContent = '⚪';
        }
    }

    updateUI() {
        const bothConnected = this.isConnected.notion && this.isConnected.google;
        document.getElementById('sync-now').disabled = !bothConnected;
        
        if (bothConnected) {
            document.getElementById('sync-now').classList.remove('pulse');
        }
    }

    async connectNotion() {
        this.showConnectionModal('notion');
    }

    async connectGoogle() {
        try {
            // First, ensure we have a user
            const userResponse = await window.electronAPI.apiRequest('POST', '/user/setup');
            
            if (!userResponse.ok) {
                this.addLog('error', 'Failed to create user account. Please check database setup.');
                return;
            }
            
            const userId = userResponse.data.user.id;
            const authUrl = `http://localhost:3000/auth/google?userId=${userId}`;
            
            this.addLog('info', 'Opening Google OAuth flow...');
            await window.electronAPI.openExternal(authUrl);
            
            // Check connection status after a delay
            setTimeout(() => {
                this.checkConnections();
            }, 5000);
            
        } catch (error) {
            this.addLog('error', `Failed to start Google OAuth: ${error.message}`);
        }
    }

    showConnectionModal(service) {
        const modal = document.getElementById('connection-modal');
        const title = document.getElementById('connection-title');
        const body = document.getElementById('connection-body');
        
        if (service === 'notion') {
            title.textContent = 'Connect Notion';
            body.innerHTML = `
                <div class="setting-group">
                    <label>Notion Database ID</label>
                    <input type="text" class="neon-input" id="modal-notion-db-id" placeholder="Enter your Notion database ID">
                    <p style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-top: 8px;">
                        Find this in your Notion database URL or integration settings.
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="neon-button secondary" onclick="app.closeConnectionModal()">Cancel</button>
                    <button class="neon-button primary" onclick="app.saveNotionConnection()">Connect</button>
                </div>
            `;
        }
        
        modal.classList.add('active');
    }

    closeConnectionModal() {
        document.getElementById('connection-modal').classList.remove('active');
    }

    async saveNotionConnection() {
        const dbId = document.getElementById('modal-notion-db-id').value.trim();
        
        if (!dbId) {
            this.addLog('error', 'Please enter a valid Notion database ID');
            return;
        }
        
        try {
            // Save to settings
            const settings = await window.electronAPI.store.get('settings') || {};
            settings.notionDbId = dbId;
            await window.electronAPI.store.set('settings', settings);
            
            this.closeConnectionModal();
            this.addLog('success', 'Notion database ID saved');
            
            // Recheck connections
            setTimeout(() => {
                this.checkConnections();
            }, 1000);
            
        } catch (error) {
            this.addLog('error', `Failed to save Notion connection: ${error.message}`);
        }
    }

    async syncNow() {
        if (!this.isConnected.notion || !this.isConnected.google) {
            this.addLog('warning', 'Both Notion and Google Calendar must be connected to sync');
            return;
        }
        
        try {
            this.addLog('info', 'Starting manual sync...');
            const response = await window.electronAPI.apiRequest('POST', '/sync/trigger');
            
            if (response.ok) {
                this.addLog('success', 'Manual sync completed successfully');
                await window.electronAPI.showNotification('Synk', 'Manual sync completed successfully!');
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
        
        // Save setting
        const settings = await window.electronAPI.store.get('settings') || {};
        settings.autoSync = enabled;
        await window.electronAPI.store.set('settings', settings);
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
                    const response = await window.electronAPI.apiRequest('POST', '/sync/trigger');
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

    openSettings() {
        document.getElementById('settings-modal').classList.add('active');
    }

    closeSettings() {
        document.getElementById('settings-modal').classList.remove('active');
    }

    async resetConnections() {
        if (confirm('Are you sure you want to reset all connections? This will clear all stored credentials.')) {
            try {
                await window.electronAPI.store.delete('settings');
                await window.electronAPI.store.delete('tokens');
                
                this.isConnected.notion = false;
                this.isConnected.google = false;
                this.updateConnectionStatus('notion', 'error', 'Disconnected');
                this.updateConnectionStatus('google', 'error', 'Disconnected');
                this.updateUI();
                
                this.addLog('warning', 'All connections reset');
                this.closeSettings();
                
            } catch (error) {
                this.addLog('error', `Failed to reset connections: ${error.message}`);
            }
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
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SynkApp();
});

// Expose app globally for modal callbacks
window.app = null;