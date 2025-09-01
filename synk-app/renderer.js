// Renderer process - Frontend OAuth integration
const { ipcRenderer } = require('electron');

class SynkRenderer {
    constructor() {
        this.config = null;
        this.isGoogleConnected = false;
        this.isNotionConnected = false;
        this.initialize();
    }

    async initialize() {
        try {
            // Get app configuration
            this.config = await ipcRenderer.invoke('get-config');
            console.log('📱 App config loaded:', this.config);

            // Setup UI event handlers
            this.setupEventHandlers();
            
            // Update UI based on config
            this.updateConfigUI();
            
            console.log('✅ Renderer initialized');
        } catch (error) {
            console.error('❌ Failed to initialize renderer:', error);
            this.showError('Failed to initialize app: ' + error.message);
        }
    }

    setupEventHandlers() {
        // Google OAuth button
        const googleBtn = document.getElementById('google-connect');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.connectGoogle());
        }

        // Notion OAuth button
        const notionBtn = document.getElementById('notion-connect');
        if (notionBtn) {
            notionBtn.addEventListener('click', () => this.connectNotion());
        }

        // Demo mode toggle
        const demoToggle = document.getElementById('demo-toggle');
        if (demoToggle) {
            demoToggle.checked = this.config?.demoMode || false;
            demoToggle.addEventListener('change', (e) => {
                this.showInfo(`Demo mode ${e.target.checked ? 'enabled' : 'disabled'}. Restart app to apply changes.`);
            });
        }
    }

    async connectGoogle() {
        const btn = document.getElementById('google-connect');
        const text = document.getElementById('google-text');
        const originalText = text.textContent;

        try {
            btn.disabled = true;
            text.innerHTML = '<span class="spinner"></span> Opening browser...';
            
            this.addLog('oauth-start', 'Google OAuth: Opening system browser...', 'info');

            // Call main process OAuth handler
            const result = await ipcRenderer.invoke('oauth-google');

            if (result.success) {
                this.isGoogleConnected = true;
                this.updateConnectionStatus('google', true, result.data.userInfo?.email, result.data.demo);
                
                if (result.data.calendars) {
                    this.loadGoogleCalendars(result.data.calendars);
                }
                
                text.textContent = 'Connected';
                
                const logMessage = result.data.demo ? 
                    'Google OAuth completed (Demo mode - consent shown, using demo data)' :
                    'Google OAuth completed successfully';
                this.addLog('oauth-success', logMessage, 'success');
                
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Google OAuth failed:', error);
            this.addLog('oauth-error', `Google OAuth failed: ${error.message}`, 'error');
            this.showError('Google connection failed: ' + error.message);
            text.textContent = originalText;
        } finally {
            btn.disabled = false;
        }
    }

    async connectNotion() {
        const btn = document.getElementById('notion-connect');
        const text = document.getElementById('notion-text');
        const originalText = text.textContent;

        try {
            btn.disabled = true;
            text.innerHTML = '<span class="spinner"></span> Opening browser...';
            
            this.addLog('oauth-start', 'Notion OAuth: Opening system browser...', 'info');

            // Call main process OAuth handler
            const result = await ipcRenderer.invoke('oauth-notion');

            if (result.success) {
                this.isNotionConnected = true;
                this.updateConnectionStatus('notion', true, result.data.workspace_name, result.data.demo);
                
                if (result.data.databases) {
                    this.loadNotionDatabases(result.data.databases);
                }
                
                text.textContent = 'Connected';
                
                const logMessage = result.data.demo ? 
                    'Notion OAuth completed (Demo mode - workspace selection shown, using demo data)' :
                    'Notion OAuth completed successfully';
                this.addLog('oauth-success', logMessage, 'success');
                
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Notion OAuth failed:', error);
            this.addLog('oauth-error', `Notion OAuth failed: ${error.message}`, 'error');
            this.showError('Notion connection failed: ' + error.message);
            text.textContent = originalText;
        } finally {
            btn.disabled = false;
        }
    }

    updateConnectionStatus(service, connected, identifier, isDemo) {
        const pill = document.getElementById(`${service}-pill`);
        const dot = document.getElementById(`${service}-status-dot`);
        const text = document.getElementById(`${service}-status-text`);
        const info = document.getElementById(`${service}-user-info`);

        if (connected) {
            pill.className = 'status-pill connected';
            dot.className = 'status-dot connected';
            text.textContent = 'Connected';
            info.textContent = `Connected to ${identifier}${isDemo ? ' (Demo)' : ''}`;
        } else {
            pill.className = 'status-pill disconnected';
            dot.className = 'status-dot disconnected';
            text.textContent = 'Not connected';
            info.textContent = `Connect to see your ${service === 'google' ? 'calendars' : 'databases'}`;
        }
    }

    loadGoogleCalendars(calendars) {
        const container = document.getElementById('calendars-content');
        if (!container) return;

        if (!calendars || calendars.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No calendars found</h3>
                    <p>Your Google account doesn't have any accessible calendars</p>
                </div>
            `;
            return;
        }

        container.innerHTML = calendars.map(calendar => `
            <div class="list-item">
                <div class="item-title">${calendar.summary || 'Untitled Calendar'}</div>
                <div class="item-meta">
                    ${calendar.description || 'No description'}
                    ${calendar.primary ? '<span class="demo-badge">Primary</span>' : ''}
                </div>
            </div>
        `).join('');
    }

    loadNotionDatabases(databases) {
        const container = document.getElementById('notion-content');
        if (!container) return;

        if (!databases || databases.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No databases found</h3>
                    <p>Your Notion workspace doesn't have any accessible databases</p>
                </div>
            `;
            return;
        }

        container.innerHTML = databases.map(db => `
            <div class="list-item">
                <div class="item-title">${db.title?.[0]?.plain_text || 'Untitled Database'}</div>
                <div class="item-meta">
                    ${db.description?.[0]?.plain_text || 'No description'}
                </div>
            </div>
        `).join('');
    }

    updateConfigUI() {
        // Update mode indicator
        const modeIndicator = document.getElementById('mode-indicator');
        if (modeIndicator) {
            modeIndicator.textContent = this.config.demoMode ? 'Demo Mode' : 'Production Mode';
            modeIndicator.className = `mode-indicator ${this.config.demoMode ? 'demo' : 'production'}`;
        }

        // Update environment info
        const envInfo = document.getElementById('env-info');
        if (envInfo) {
            envInfo.textContent = `Environment: ${this.config.mode}`;
        }
    }

    addLog(action, message, type = 'info') {
        const logsContainer = document.getElementById('logs-container');
        if (!logsContainer) return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-time">${timestamp}</span>
            <span class="log-action">${action}</span>
            <span class="log-result ${type}">${message}</span>
        `;

        logsContainer.insertBefore(logEntry, logsContainer.firstChild);

        // Keep only last 50 logs
        while (logsContainer.children.length > 50) {
            logsContainer.removeChild(logsContainer.lastChild);
        }
    }

    showError(message) {
        // Simple error display - in production, use a proper toast/modal
        console.error('UI Error:', message);
        alert('Error: ' + message);
    }

    showInfo(message) {
        // Simple info display - in production, use a proper toast/modal
        console.info('UI Info:', message);
        alert('Info: ' + message);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.synkRenderer = new SynkRenderer();
});