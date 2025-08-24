// src/renderer/renderer.js
const notionConnectBtn = document.getElementById('connect-notion-btn');       // your existing button id
const googleConnectBtn = document.getElementById('connect-google-btn');       // existing
const syncNowBtn = document.getElementById('sync-now-btn');                   // existing
const logPanel = document.getElementById('log-container');                    // existing log container

const notionConfigPanel = document.getElementById('notion-config');
const notionDbSelect = document.getElementById('notion-db');
const notionSpaceSelect = document.getElementById('notion-space');
const notionConfigSave = document.getElementById('save-notion-config');
const notionConfigStatus = document.getElementById('notion-config-status');

function appendLog(line) {
  if (!logPanel) return;
  const el = document.createElement('div');
  el.className = 'log-entry info';
  el.innerHTML = `
    <span class="log-time">${new Date().toLocaleTimeString()}</span>
    <span class="log-message">${line}</span>
  `;
  logPanel.appendChild(el);
  logPanel.scrollTop = logPanel.scrollHeight;
}

if (notionConnectBtn) {
  notionConnectBtn.addEventListener('click', async () => {
    appendLog('Connecting Notion…');
    try {
      // For MVP we support internal token entry (dialog or input in your UI).
      // Replace `getNotionTokenFromUI()` with your existing token capture.
      const token = getNotionTokenFromUI(); // implement or reuse
      if (!token) throw new Error('No Notion token provided');
      const res = await window.api.connectNotion({ token });
      if (res && res.ok) {
        appendLog('Notion connected.');
        notionConfigPanel.classList.remove('hidden');
        // Load DBs
        const dbs = await window.api.listNotionDatabases();
        renderDatabaseOptions(dbs);
      } else {
        throw new Error(res && res.error ? res.error : 'Notion connect failed');
      }
    } catch (e) {
      appendLog(`Notion error: ${e.message || e}`);
    }
  });
}

function renderDatabaseOptions(dbs) {
  notionDbSelect.innerHTML = '';
  if (!Array.isArray(dbs) || dbs.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No databases shared with Synk';
    opt.disabled = true; opt.selected = true;
    notionDbSelect.appendChild(opt);
    return;
  }
  for (const db of dbs) {
    const opt = document.createElement('option');
    opt.value = db.id;
    opt.textContent = db.title || db.id;
    notionDbSelect.appendChild(opt);
  }
}

if (notionConfigSave) {
  notionConfigSave.addEventListener('click', async () => {
    const selection = {
      space: notionSpaceSelect.value,
      databaseId: notionDbSelect.value
    };
    // Persist to local store via your existing mechanism or IPC later
    appendLog(`Saved Notion selection: DB ${selection.databaseId} (${selection.space})`);
    notionConfigStatus.textContent = 'Saved.';
    setTimeout(() => notionConfigStatus.textContent = '', 1200);
    // Trigger an immediate sync attempt
    const res = await window.api.syncNow();
    if (res.ok) appendLog('Sync completed.');
    else appendLog(`Sync error: ${res.error}`);
  });
}

if (syncNowBtn) {
  syncNowBtn.addEventListener('click', async () => {
    appendLog('Manual sync requested…');
    const res = await window.api.syncNow();
    if (res.ok) appendLog('Sync completed.');
    else appendLog(`Sync error: ${res.error}`);
  });
}

// Tray "Sync Now" to UI
window.api.onUiSyncNow(async () => {
  appendLog('Tray: Sync Now triggered…');
  const res = await window.api.syncNow();
  if (res.ok) appendLog('Sync completed.');
  else appendLog(`Sync error: ${res.error}`);
});

// Placeholder: replace with your actual UI token entry
function getNotionTokenFromUI() {
  const input = document.getElementById('notion-db-id');
  return input && input.value ? input.value.trim() : null;
}

// Synk Desktop App Renderer Process - Phase 1
class SynkRenderer {
    constructor() {
        this.connections = { notion: false, google: false };
        this.syncPaused = false;
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

        // Sync buttons
        document.getElementById('sync-now-btn').addEventListener('click', () => {
            this.syncNow();
        });

        document.getElementById('pause-sync-btn').addEventListener('click', () => {
            this.toggleSync();
        });

        // Settings
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Log refresh
        document.getElementById('refresh-log-btn').addEventListener('click', () => {
            this.loadSyncLog();
        });

        // Notion config save
        document.getElementById('save-notion-config').addEventListener('click', () => {
            this.saveNotionConfig();
        });
    }

    setupElectronListeners() {
        // Listen for tray sync events
        if (window.api && window.api.onUiSyncNow) {
            window.api.onUiSyncNow(() => {
                this.syncNow();
            });
        }
        // Additional listeners can be added here as needed
    }

    async loadSettings() {
        try {
            // Load settings from localStorage for now
            const settings = JSON.parse(localStorage.getItem('synk-settings') || '{}');
            
            // Update UI with settings
            if (document.getElementById('launch-startup')) {
                document.getElementById('launch-startup').checked = settings.launchOnStartup || false;
            }
            if (document.getElementById('notifications-enabled')) {
                document.getElementById('notifications-enabled').checked = settings.notificationsEnabled || true;
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            const settings = {
                launchOnStartup: document.getElementById('launch-startup')?.checked || false,
                notificationsEnabled: document.getElementById('notifications-enabled')?.checked || true
            };

            localStorage.setItem('synk-settings', JSON.stringify(settings));
            this.showNotification('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    async loadSyncLog() {
        try {
            // Load log entries from localStorage for now
            const logEntries = JSON.parse(localStorage.getItem('synk-log') || '[]');
            const logContainer = document.getElementById('log-container');
            
            if (logContainer) {
                // Clear existing entries
                logContainer.innerHTML = '';
                
                // Add log entries
                logEntries.forEach(entry => {
                    this.addLogEntry(entry, false);
                });
                
                // Scroll to bottom
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        } catch (error) {
            console.error('Failed to load sync log:', error);
        }
    }

    addLogEntry(logEntry, scroll = true) {
        const logContainer = document.getElementById('log-container');
        if (!logContainer) return;
        
        const time = logEntry.timestamp ? new Date(logEntry.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
        
        const logElement = document.createElement('div');
        logElement.className = `log-entry ${logEntry.type || 'info'}`;
        logElement.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message">${logEntry.message || logEntry}</span>
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
        
        // Save to localStorage
        try {
            const logEntries = JSON.parse(localStorage.getItem('synk-log') || '[]');
            logEntries.push({
                timestamp: new Date().toISOString(),
                type: logEntry.type || 'info',
                message: logEntry.message || logEntry
            });
            
            // Keep only last 50 entries
            if (logEntries.length > 50) {
                logEntries.splice(0, logEntries.length - 50);
            }
            
            localStorage.setItem('synk-log', JSON.stringify(logEntries));
        } catch (error) {
            console.error('Failed to save log entry:', error);
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
        syncButton.disabled = !bothConnected || this.syncPaused;
        
        if (bothConnected && !this.syncPaused) {
            syncButton.classList.add('ready');
        } else {
            syncButton.classList.remove('ready');
        }

        // Hide error boxes if connections are successful
        if (connections.notion) {
            this.hideError('notion-error');
        }
        if (connections.google) {
            this.hideError('google-error');
        }
    }

    updateSyncStatus() {
        const syncStatus = document.getElementById('sync-status');
        const syncLabel = syncStatus.querySelector('.sync-label');
        const pauseButton = document.getElementById('pause-sync-btn');
        const pauseIcon = pauseButton.querySelector('.button-icon');
        
        if (this.syncPaused) {
            syncStatus.classList.remove('active');
            syncStatus.classList.add('paused');
            syncLabel.textContent = 'Sync Paused';
            pauseButton.innerHTML = '<span class="button-icon">▶️</span>Resume Sync';
        } else {
            syncStatus.classList.remove('paused');
            syncStatus.classList.add('active');
            syncLabel.textContent = 'Sync Active';
            pauseButton.innerHTML = '<span class="button-icon">⏸️</span>Pause Sync';
        }

        // Update sync now button
        const syncButton = document.getElementById('sync-now-btn');
        const bothConnected = this.connections.notion && this.connections.google;
        syncButton.disabled = !bothConnected || this.syncPaused;
    }

    async connectNotion() {
        const dbIdInput = document.getElementById('notion-db-id');
        const dbId = dbIdInput.value.trim();
        
        if (!dbId) {
            this.showError('notion-error', 'Please enter a Notion Database ID');
            return;
        }
        
        try {
            const button = document.getElementById('connect-notion-btn');
            button.textContent = 'Connecting...';
            button.disabled = true;
            
            this.hideError('notion-error');
            
            const result = await window.api.connectNotion(dbId);
            
            if (result.ok) {
                this.showNotification('Notion connected successfully', 'success');
                dbIdInput.value = '';
                this.connections.notion = true;
                this.updateConnectionStatus(this.connections);
                
                // Show Notion config panel and load databases
                await this.showNotionConfig();
            } else {
                this.showError('notion-error', `Failed to connect Notion: ${result.error}`);
            }
        } catch (error) {
            this.showError('notion-error', `Connection failed: ${error.message}`);
        } finally {
            const button = document.getElementById('connect-notion-btn');
            button.textContent = 'Connect';
            button.disabled = false;
        }
    }

    async showNotionConfig() {
        const configPanel = document.getElementById('notion-config');
        configPanel.classList.remove('hidden');
        
        // Load databases
        try {
            const result = await window.api.listNotionDatabases();
            const dbSelect = document.getElementById('notion-db');
            
            if (result.ok) {
                dbSelect.innerHTML = '';
                result.databases.forEach(db => {
                    const option = document.createElement('option');
                    option.value = db.id;
                    option.textContent = db.title;
                    dbSelect.appendChild(option);
                });
            } else {
                dbSelect.innerHTML = '<option disabled>Failed to load databases</option>';
            }
        } catch (error) {
            console.error('Failed to load databases:', error);
        }
    }

    async connectGoogle() {
        try {
            const button = document.getElementById('connect-google-btn');
            button.textContent = 'Opening OAuth...';
            button.disabled = true;
            
            this.hideError('google-error');
            
            const result = await window.electronAPI.connectGoogle();
            
            if (result.success) {
                this.showNotification('Google OAuth opened in browser. Complete authorization and return here.', 'info');
            } else {
                this.showError('google-error', `Failed to start Google OAuth: ${result.error}`);
            }
        } catch (error) {
            this.showError('google-error', `OAuth failed: ${error.message}`);
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

        if (this.syncPaused) {
            this.showNotification('Sync is paused. Resume sync first.', 'warning');
            return;
        }
        
        try {
            const button = document.getElementById('sync-now-btn');
            const originalText = button.innerHTML;
            button.innerHTML = '<span class="button-icon">⏳</span>Syncing...';
            button.disabled = true;
            
            const result = await window.api.syncNow();
            
            if (result.ok) {
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

    saveNotionConfig() {
        const space = document.getElementById('notion-space').value;
        const dbId = document.getElementById('notion-db').value;
        const statusSpan = document.getElementById('notion-config-status');
        
        if (!dbId) {
            statusSpan.textContent = 'Please select a database';
            statusSpan.style.color = '#ff4444';
            return;
        }
        
        // Save configuration (you can extend this to use electron-store)
        localStorage.setItem('notion-config', JSON.stringify({ space, dbId }));
        
        statusSpan.textContent = 'Configuration saved!';
        statusSpan.style.color = '#00ff88';
        
        setTimeout(() => {
            statusSpan.textContent = '';
        }, 3000);
    }

    async toggleSync() {
        try {
            const result = await window.electronAPI.toggleSync();
            this.syncPaused = result.paused;
            this.updateSyncStatus();
            
            const message = this.syncPaused ? 'Sync paused' : 'Sync resumed';
            this.showNotification(message, 'info');
        } catch (error) {
            this.showNotification(`Failed to toggle sync: ${error.message}`, 'error');
        }
    }

    showError(errorBoxId, message) {
        const errorBox = document.getElementById(errorBoxId);
        const errorMessage = errorBox.querySelector('.error-message');
        
        errorMessage.textContent = message;
        errorBox.style.display = 'flex';
    }

    hideError(errorBoxId) {
        const errorBox = document.getElementById(errorBoxId);
        errorBox.style.display = 'none';
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
                    border-radius: 6px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    background: #000000;
                    color: #ffffff;
                    font-size: 0.9rem;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    min-width: 300px;
                    animation: slideIn 0.3s ease;
                }
                
                .notification.success {
                    border-color: rgba(0, 255, 136, 0.5);
                    box-shadow: 0 0 10px rgba(0, 255, 136, 0.2);
                }
                
                .notification.error {
                    border-color: rgba(255, 68, 68, 0.5);
                    box-shadow: 0 0 10px rgba(255, 68, 68, 0.2);
                }
                
                .notification.warning {
                    border-color: rgba(255, 170, 0, 0.5);
                    box-shadow: 0 0 10px rgba(255, 170, 0, 0.2);
                }
                
                .notification.info {
                    border-color: rgba(0, 170, 255, 0.5);
                    box-shadow: 0 0 10px rgba(0, 170, 255, 0.2);
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

// Global retry functions for error boxes
function retryNotionConnection() {
    const renderer = window.synkRenderer;
    if (renderer) {
        renderer.connectNotion();
    }
}

function retryGoogleConnection() {
    const renderer = window.synkRenderer;
    if (renderer) {
        renderer.connectGoogle();
    }
}

// Initialize the renderer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.synkRenderer = new SynkRenderer();
});