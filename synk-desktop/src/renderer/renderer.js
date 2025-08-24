// Synk Desktop App Renderer Process
class SynkRenderer {
    constructor() {
        this.connections = { notion: false, google: false };
        this.init();
    }

    async init() {
        this.setupTabs();
        this.setupEventListeners();
        await this.loadSettings();
        await this.loadSyncLog();
        this.setupElectronListeners();
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update active tab pane
                tabPanes.forEach(pane => pane.classList.remove('active'));
                document.getElementById(`${targetTab}-tab`).classList.add('active');
            });
        });
    }

    setupEventListeners() {
        // Connection buttons
        document.getElementById('connect-notion-btn').addEventListener('click', () => {
            this.connectNotion();
        });

        document.getElementById('connect-google-btn').addEventListener('click', () => {
            this.connectGoogle();
        });

        // Sync button
        document.getElementById('sync-now-btn').addEventListener('click', () => {
            this.syncNow();
        });

        // Settings
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Log refresh
        document.getElementById('refresh-log-btn').addEventListener('click', () => {
            this.loadSyncLog();
        });

        // Check updates
        document.getElementById('check-updates-btn').addEventListener('click', () => {
            this.checkUpdates();
        });
    }

    setupElectronListeners() {
        // Listen for connection updates
        window.electronAPI.onConnectionsUpdated((event, connections) => {
            this.updateConnectionStatus(connections);
        });

        // Listen for log updates
        window.electronAPI.onLogUpdated((event, logEntry) => {
            this.addLogEntry(logEntry);
        });
    }

    async loadSettings() {
        try {
            const settings = await window.electronAPI.getSettings();
            
            // Update UI with settings
            document.getElementById('launch-startup').checked = settings.launchOnStartup;
            document.getElementById('notifications-enabled').checked = settings.notificationsEnabled;
            
            // Update connection status
            this.updateConnectionStatus(settings.connections);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            const settings = {
                launchOnStartup: document.getElementById('launch-startup').checked,
                notificationsEnabled: document.getElementById('notifications-enabled').checked
            };

            await window.electronAPI.saveSettings(settings);
            this.showNotification('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    async loadSyncLog() {
        try {
            const logEntries = await window.electronAPI.getSyncLog();
            const logContainer = document.getElementById('log-container');
            
            // Clear existing entries
            logContainer.innerHTML = '';
            
            // Add log entries
            logEntries.forEach(entry => {
                this.addLogEntry(entry, false);
            });
            
            // Scroll to bottom
            logContainer.scrollTop = logContainer.scrollHeight;
        } catch (error) {
            console.error('Failed to load sync log:', error);
        }
    }

    addLogEntry(logEntry, scroll = true) {
        const logContainer = document.getElementById('log-container');
        const time = new Date(logEntry.timestamp).toLocaleTimeString();
        
        const logElement = document.createElement('div');
        logElement.className = `log-entry ${logEntry.type}`;
        logElement.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message">${logEntry.message}</span>
        `;
        
        logContainer.appendChild(logElement);
        
        // Keep only last 50 entries
        const entries = logContainer.querySelectorAll('.log-entry');
        if (entries.length > 50) {
            entries[0].remove();
        }
        
        if (scroll) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    updateConnectionStatus(connections) {
        this.connections = connections;
        
        // Update header indicators
        const notionIndicator = document.getElementById('notion-indicator');
        const googleIndicator = document.getElementById('google-indicator');
        
        notionIndicator.classList.toggle('connected', connections.notion);
        googleIndicator.classList.toggle('connected', connections.google);
        
        // Update service status in connections tab
        const notionStatus = document.getElementById('notion-status');
        const googleStatus = document.getElementById('google-status');
        
        notionStatus.classList.toggle('connected', connections.notion);
        notionStatus.querySelector('.status-text').textContent = 
            connections.notion ? 'Connected' : 'Disconnected';
            
        googleStatus.classList.toggle('connected', connections.google);
        googleStatus.querySelector('.status-text').textContent = 
            connections.google ? 'Connected' : 'Disconnected';
        
        // Update sync button
        const syncButton = document.getElementById('sync-now-btn');
        const bothConnected = connections.notion && connections.google;
        syncButton.disabled = !bothConnected;
        
        if (bothConnected) {
            syncButton.classList.add('pulse');
        } else {
            syncButton.classList.remove('pulse');
        }
    }

    async connectNotion() {
        const dbIdInput = document.getElementById('notion-db-id');
        const dbId = dbIdInput.value.trim();
        
        if (!dbId) {
            this.showNotification('Please enter a Notion Database ID', 'warning');
            return;
        }
        
        try {
            const button = document.getElementById('connect-notion-btn');
            button.textContent = 'Connecting...';
            button.disabled = true;
            
            const result = await window.electronAPI.connectNotion(dbId);
            
            if (result.success) {
                this.showNotification('Notion connected successfully', 'success');
                dbIdInput.value = '';
            } else {
                this.showNotification(`Failed to connect Notion: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`Connection failed: ${error.message}`, 'error');
        } finally {
            const button = document.getElementById('connect-notion-btn');
            button.textContent = 'Connect';
            button.disabled = false;
        }
    }

    async connectGoogle() {
        try {
            const button = document.getElementById('connect-google-btn');
            button.textContent = 'Opening OAuth...';
            button.disabled = true;
            
            const result = await window.electronAPI.connectGoogle();
            
            if (result.success) {
                this.showNotification('Google OAuth opened in browser. Complete authorization and return here.', 'info');
            } else {
                this.showNotification(`Failed to start Google OAuth: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`OAuth failed: ${error.message}`, 'error');
        } finally {
            const button = document.getElementById('connect-google-btn');
            button.textContent = 'Connect';
            button.disabled = false;
        }
    }

    async syncNow() {
        if (!this.connections.notion || !this.connections.google) {
            this.showNotification('Both services must be connected to sync', 'warning');
            return;
        }
        
        try {
            const button = document.getElementById('sync-now-btn');
            const originalText = button.innerHTML;
            button.innerHTML = '<span class="button-icon">⏳</span>Syncing...';
            button.disabled = true;
            
            const result = await window.electronAPI.forceSync();
            
            if (result.success) {
                this.showNotification('Manual sync completed successfully', 'success');
            } else {
                this.showNotification(`Sync failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`Sync failed: ${error.message}`, 'error');
        } finally {
            const button = document.getElementById('sync-now-btn');
            button.innerHTML = '<span class="button-icon">🔄</span>Sync Now';
            button.disabled = false;
        }
    }

    async checkUpdates() {
        const button = document.getElementById('check-updates-btn');
        button.textContent = 'Checking...';
        button.disabled = true;
        
        // Simulate update check
        setTimeout(() => {
            this.showNotification('You are running the latest version', 'info');
            button.textContent = 'Check for Updates';
            button.disabled = false;
        }, 2000);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Add notification styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    background: rgba(0, 0, 0, 0.9);
                    color: #ffffff;
                    font-size: 0.9rem;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    min-width: 300px;
                    backdrop-filter: blur(10px);
                    animation: slideIn 0.3s ease;
                }
                
                .notification.success {
                    border-color: rgba(0, 255, 136, 0.5);
                    box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
                }
                
                .notification.error {
                    border-color: rgba(255, 68, 68, 0.5);
                    box-shadow: 0 0 20px rgba(255, 68, 68, 0.2);
                }
                
                .notification.warning {
                    border-color: rgba(255, 170, 0, 0.5);
                    box-shadow: 0 0 20px rgba(255, 170, 0, 0.2);
                }
                
                .notification.info {
                    border-color: rgba(0, 170, 255, 0.5);
                    box-shadow: 0 0 20px rgba(0, 170, 255, 0.2);
                }
                
                .notification-message {
                    flex: 1;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .notification-close:hover {
                    color: #ffffff;
                }
                
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Add to document
        document.body.appendChild(notification);
        
        // Close button functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize the renderer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SynkRenderer();
});