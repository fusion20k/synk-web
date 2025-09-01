// OAuth callback server for handling token exchange
const express = require('express');
const fetch = require('node-fetch');
const config = require('./config');

class OAuthServer {
    constructor() {
        this.app = express();
        this.server = null;
        this.port = 3000;
        this.storedStates = new Map(); // Store PKCE data temporarily
        this.setupRoutes();
    }

    setupRoutes() {
        // Google OAuth callback
        this.app.get('/oauth/google/callback', async (req, res) => {
            try {
                const { code, state, error } = req.query;

                if (error) {
                    console.error('❌ Google OAuth error:', error);
                    res.send('<html><body><h2>OAuth Error</h2><p>Authorization failed. You can close this window.</p></body></html>');
                    return;
                }

                if (!code || !state) {
                    console.error('❌ Missing code or state in Google callback');
                    res.send('<html><body><h2>OAuth Error</h2><p>Missing authorization code. You can close this window.</p></body></html>');
                    return;
                }

                // Validate state and get stored PKCE data
                const storedData = this.storedStates.get(state);
                if (!storedData) {
                    console.error('❌ Invalid state parameter');
                    res.send('<html><body><h2>OAuth Error</h2><p>Invalid state parameter. You can close this window.</p></body></html>');
                    return;
                }

                console.log('🔄 Exchanging Google authorization code for tokens...');

                // Exchange code for tokens
                const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        code,
                        client_id: config.get('GOOGLE_CLIENT_ID'),
                        client_secret: config.get('GOOGLE_CLIENT_SECRET'),
                        redirect_uri: config.get('GOOGLE_REDIRECT_URI'),
                        grant_type: 'authorization_code',
                        code_verifier: storedData.codeVerifier
                    })
                });

                const tokens = await tokenResponse.json();

                if (tokens.error) {
                    console.error('❌ Google token exchange error:', tokens.error);
                    res.send('<html><body><h2>OAuth Error</h2><p>Token exchange failed. You can close this window.</p></body></html>');
                    return;
                }

                // Get user info
                const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': `Bearer ${tokens.access_token}` }
                });
                const userInfo = await userResponse.json();

                // Get calendars
                const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
                    headers: { 'Authorization': `Bearer ${tokens.access_token}` }
                });
                const calendarsData = await calendarsResponse.json();

                // Store tokens securely (in production, use keytar or similar)
                this.storeTokens('google', {
                    ...tokens,
                    userInfo,
                    calendars: calendarsData.items || []
                });

                // Clean up stored state
                this.storedStates.delete(state);

                console.log('✅ Google OAuth completed successfully');
                res.send(`
                    <html>
                        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px;">
                            <h2 style="color: #667eea;">Google Calendar Connected!</h2>
                            <p>Successfully connected to ${userInfo.email}</p>
                            <p>Found ${calendarsData.items?.length || 0} calendars</p>
                            <p><em>You can close this window and return to Synk.</em></p>
                        </body>
                    </html>
                `);

            } catch (error) {
                console.error('❌ Google OAuth callback error:', error);
                res.send('<html><body><h2>OAuth Error</h2><p>An unexpected error occurred. You can close this window.</p></body></html>');
            }
        });

        // Notion OAuth callback
        this.app.get('/oauth/notion/callback', async (req, res) => {
            try {
                const { code, state, error } = req.query;

                if (error) {
                    console.error('❌ Notion OAuth error:', error);
                    res.send('<html><body><h2>OAuth Error</h2><p>Authorization failed. You can close this window.</p></body></html>');
                    return;
                }

                if (!code || !state) {
                    console.error('❌ Missing code or state in Notion callback');
                    res.send('<html><body><h2>OAuth Error</h2><p>Missing authorization code. You can close this window.</p></body></html>');
                    return;
                }

                // Validate state
                const storedData = this.storedStates.get(state);
                if (!storedData) {
                    console.error('❌ Invalid state parameter');
                    res.send('<html><body><h2>OAuth Error</h2><p>Invalid state parameter. You can close this window.</p></body></html>');
                    return;
                }

                console.log('🔄 Exchanging Notion authorization code for tokens...');

                // Exchange code for tokens
                const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${Buffer.from(`${config.get('NOTION_CLIENT_ID')}:${config.get('NOTION_CLIENT_SECRET')}`).toString('base64')}`
                    },
                    body: JSON.stringify({
                        grant_type: 'authorization_code',
                        code,
                        redirect_uri: config.get('NOTION_REDIRECT_URI')
                    })
                });

                const tokens = await tokenResponse.json();

                if (tokens.error) {
                    console.error('❌ Notion token exchange error:', tokens.error);
                    res.send('<html><body><h2>OAuth Error</h2><p>Token exchange failed. You can close this window.</p></body></html>');
                    return;
                }

                // Get databases
                const databasesResponse = await fetch('https://api.notion.com/v1/search', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${tokens.access_token}`,
                        'Content-Type': 'application/json',
                        'Notion-Version': '2022-06-28'
                    },
                    body: JSON.stringify({
                        filter: { property: 'object', value: 'database' }
                    })
                });
                const databasesData = await databasesResponse.json();

                // Store tokens securely
                this.storeTokens('notion', {
                    ...tokens,
                    databases: databasesData.results || []
                });

                // Clean up stored state
                this.storedStates.delete(state);

                console.log('✅ Notion OAuth completed successfully');
                res.send(`
                    <html>
                        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px;">
                            <h2 style="color: #667eea;">Notion Connected!</h2>
                            <p>Successfully connected to workspace: ${tokens.workspace_name || 'Unknown'}</p>
                            <p>Found ${databasesData.results?.length || 0} databases</p>
                            <p><em>You can close this window and return to Synk.</em></p>
                        </body>
                    </html>
                `);

            } catch (error) {
                console.error('❌ Notion OAuth callback error:', error);
                res.send('<html><body><h2>OAuth Error</h2><p>An unexpected error occurred. You can close this window.</p></body></html>');
            }
        });

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', mode: config.get('MODE'), demo: config.isDemoMode() });
        });
    }

    storeState(state, data) {
        this.storedStates.set(state, data);
        // Clean up after 10 minutes
        setTimeout(() => {
            this.storedStates.delete(state);
        }, 10 * 60 * 1000);
    }

    storeTokens(service, tokens) {
        // In production, use keytar or secure storage
        // For now, store in memory (will be lost on restart)
        if (!this.tokens) this.tokens = {};
        this.tokens[service] = tokens;
        console.log(`🔐 ${service} tokens stored securely`);
    }

    getTokens(service) {
        return this.tokens?.[service];
    }

    start() {
        if (config.isDevelopment()) {
            return new Promise((resolve, reject) => {
                this.server = this.app.listen(this.port, (err) => {
                    if (err) {
                        console.error('❌ Failed to start OAuth server:', err);
                        reject(err);
                    } else {
                        console.log(`🚀 OAuth server running on http://localhost:${this.port}`);
                        resolve();
                    }
                });
            });
        } else {
            console.log('📡 Production mode: expecting external server to handle OAuth callbacks');
            return Promise.resolve();
        }
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log('🛑 OAuth server stopped');
        }
    }
}

module.exports = OAuthServer;