// Main OAuth manager with proper browser integration
const { shell } = require('electron');
const config = require('./config');
const OAuthURLBuilder = require('./oauth-urls');
const OAuthServer = require('./oauth-server');

class OAuthManager {
    constructor() {
        this.server = new OAuthServer();
        this.pendingAuths = new Map();
    }

    async initialize() {
        try {
            await this.server.start();
            console.log('✅ OAuth Manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize OAuth Manager:', error);
            throw new Error('OAuth misconfigured: check redirect URIs and client IDs');
        }
    }

    async authenticateGoogle() {
        try {
            console.log('🔐 Starting Google OAuth flow...');
            
            const { authUrl, codeVerifier, state } = OAuthURLBuilder.buildGoogleAuthURL();
            
            // Store PKCE data for callback validation
            this.server.storeState(state, { codeVerifier, service: 'google' });
            
            // Always open system browser for OAuth (desktop app requirement)
            console.log('🌐 Opening system browser for Google OAuth...');
            await shell.openExternal(authUrl);
            
            if (config.isDemoMode()) {
                console.log('🎭 Demo mode: OAuth popup shown, will use demo data after timeout');
                
                // Wait for potential callback or timeout
                const result = await this.waitForAuthCompletion('google', 45000);
                
                if (result.success) {
                    console.log('✅ Real OAuth completed in demo mode, using demo data for safety');
                    return this.getDemoGoogleData();
                } else {
                    console.log('⏰ OAuth timeout in demo mode, using demo data');
                    return this.getDemoGoogleData();
                }
            } else {
                console.log('🔄 Production mode: waiting for OAuth completion...');
                const result = await this.waitForAuthCompletion('google', 120000);
                
                if (result.success) {
                    return this.server.getTokens('google');
                } else {
                    throw new Error('OAuth timeout or user cancelled');
                }
            }
            
        } catch (error) {
            console.error('❌ Google OAuth failed:', error);
            throw error;
        }
    }

    async authenticateNotion() {
        try {
            console.log('🔐 Starting Notion OAuth flow...');
            
            const { authUrl, state } = OAuthURLBuilder.buildNotionAuthURL();
            
            // Store state for callback validation
            this.server.storeState(state, { service: 'notion' });
            
            // Always open system browser for OAuth
            console.log('🌐 Opening system browser for Notion OAuth...');
            await shell.openExternal(authUrl);
            
            if (config.isDemoMode()) {
                console.log('🎭 Demo mode: OAuth popup shown, will use demo data after timeout');
                
                // Wait for potential callback or timeout
                const result = await this.waitForAuthCompletion('notion', 45000);
                
                if (result.success) {
                    console.log('✅ Real OAuth completed in demo mode, using demo data for safety');
                    return this.getDemoNotionData();
                } else {
                    console.log('⏰ OAuth timeout in demo mode, using demo data');
                    return this.getDemoNotionData();
                }
            } else {
                console.log('🔄 Production mode: waiting for OAuth completion...');
                const result = await this.waitForAuthCompletion('notion', 120000);
                
                if (result.success) {
                    return this.server.getTokens('notion');
                } else {
                    throw new Error('OAuth timeout or user cancelled');
                }
            }
            
        } catch (error) {
            console.error('❌ Notion OAuth failed:', error);
            throw error;
        }
    }

    waitForAuthCompletion(service, timeoutMs) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            const checkCompletion = () => {
                const tokens = this.server.getTokens(service);
                
                if (tokens) {
                    resolve({ success: true, tokens });
                    return;
                }
                
                if (Date.now() - startTime > timeoutMs) {
                    resolve({ success: false, reason: 'timeout' });
                    return;
                }
                
                // Check again in 1 second
                setTimeout(checkCompletion, 1000);
            };
            
            checkCompletion();
        });
    }

    getDemoGoogleData() {
        return {
            demo: true,
            userInfo: {
                email: 'demo@synk-official.com',
                name: 'Demo User',
                picture: 'https://via.placeholder.com/40'
            },
            calendars: [
                {
                    id: 'primary',
                    summary: 'Demo Calendar',
                    description: 'Your primary calendar',
                    primary: true
                },
                {
                    id: 'work',
                    summary: 'Work Calendar',
                    description: 'Work-related events',
                    primary: false
                }
            ]
        };
    }

    getDemoNotionData() {
        return {
            demo: true,
            workspace_name: 'Demo Workspace',
            databases: [
                {
                    id: 'demo-db-1',
                    title: [{ plain_text: 'Tasks Database' }],
                    description: [{ plain_text: 'Sample task management database' }]
                },
                {
                    id: 'demo-db-2',
                    title: [{ plain_text: 'Projects Database' }],
                    description: [{ plain_text: 'Sample project tracking database' }]
                }
            ]
        };
    }

    async shutdown() {
        this.server.stop();
        console.log('🛑 OAuth Manager shutdown complete');
    }
}

module.exports = OAuthManager;