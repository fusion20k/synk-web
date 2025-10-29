// Standalone OAuth server that works independently of Electron
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

class StandaloneOAuthServer {
  constructor() {
    this.server = null;
    this.port = null;
    this.activeFlows = new Map();
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log(`OAuth server already running on port ${this.port}`);
      return this.port;
    }

    // Get port from .env or default to 3000
    let port = parseInt(process.env.OAUTH_PORT) || 3000;
    
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });
      
      const tryListen = (currentPort) => {
        this.server.listen(currentPort, '127.0.0.1', () => {
          this.port = currentPort;
          this.isRunning = true;
          console.log(`✅ OAuth server started on http://127.0.0.1:${currentPort}`);
          resolve(currentPort);
        });
        
        this.server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
            this.server.removeAllListeners('error');
            tryListen(currentPort + 1);
          } else {
            reject(new Error(`Server error: ${error.message}`));
          }
        });
      };
      
      tryListen(port);
    });
  }

  handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${this.port}`);
    console.log(`📥 OAuth server request: ${req.method} ${url.pathname}`);

    // Add CORS headers for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (url.pathname === '/oauth2callback') {
      this.handleOAuthCallback(req, res, url);
    } else if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        port: this.port,
        activeFlows: this.activeFlows.size 
      }));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }

  async handleOAuthCallback(req, res, url) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log(`📋 OAuth callback received:`, { 
      code: code ? code.substring(0, 20) + '...' : null, 
      state, 
      error 
    });

    // Send immediate response to browser
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Synk - OAuth ${error ? 'Failed' : 'Success'}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: #111; 
              color: #fff; 
            }
            .success { color: #4CAF50; }
            .error { color: #f44336; }
            .spinner { 
              border: 2px solid #333;
              border-top: 2px solid #4CAF50;
              border-radius: 50%;
              width: 20px;
              height: 20px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <h2 class="${error ? 'error' : 'success'}">
            ${error ? 'Authorization Failed' : 'Authorization Successful!'}
          </h2>
          <p>${error ? `Error: ${error}` : 'Processing your authorization...'}</p>
          ${!error ? '<div class="spinner"></div>' : ''}
          <p><small>This window will close automatically</small></p>
          <script>
            setTimeout(() => {
              window.close();
            }, ${error ? 3000 : 5000});
          </script>
        </body>
      </html>
    `);

    if (error) {
      console.error(`❌ OAuth error: ${error}`);
      return;
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return;
    }

    // Process the OAuth callback
    try {
      console.log('🔄 Processing OAuth callback...');
      const result = await this.processGoogleCallback(code, state);
      console.log('✅ OAuth callback processed successfully');
      
      // Here you would normally send the result to the Electron app
      // For now, just log it
      console.log('📊 OAuth Result:', {
        user: result.user?.email,
        calendars: result.calendars?.length || 0
      });
      
    } catch (callbackError) {
      console.error('❌ OAuth callback processing failed:', callbackError.message);
    }
  }

  async processGoogleCallback(code, state) {
    console.log('🔄 Exchanging code for tokens...');
    
    // Get environment variables
    const DEMO_MODE = process.env.DEMO_MODE === 'true';
    const GOOGLE_CLIENT_ID = DEMO_MODE ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = DEMO_MODE ? process.env.GOOGLE_CLIENT_SECRET_DEMO : process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_REDIRECT_URI = DEMO_MODE ? process.env.GOOGLE_REDIRECT_URI_DEMO : process.env.GOOGLE_REDIRECT_URI;
    
    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code, {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      redirectUri: GOOGLE_REDIRECT_URI
    });
    
    console.log('✅ Tokens received:', {
      access_token: tokens.access_token ? 'Present' : 'Missing',
      refresh_token: tokens.refresh_token ? 'Present' : 'Missing',
      expires_in: tokens.expires_in
    });
    
    // Get user info
    console.log('👤 Fetching user info...');
    const userInfo = await this.fetchUserInfo(tokens.access_token);
    console.log('✅ User info:', userInfo.email);
    
    // Fetch calendars
    console.log('📅 Fetching calendars...');
    const calendars = await this.fetchCalendars(tokens.access_token);
    console.log(`✅ Calendars fetched: ${calendars.items?.length || 0} found`);
    
    // Store tokens (in a real app, you'd use electron-store)
    console.log('💾 Storing tokens...');
    
    return {
      ok: true,
      user: userInfo,
      calendars: calendars.items || [],
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in
      }
    };
  }

  async exchangeCodeForTokens(code, config) {
    const fetch = require('node-fetch');
    
    const tokenData = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri
    };

    console.log('🔄 Token exchange request to Google...');
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenData)
    });

    const tokens = await response.json();
    
    if (!response.ok) {
      console.error('❌ Token exchange failed:', tokens);
      throw new Error(`Token exchange failed: ${tokens.error_description || tokens.error}`);
    }

    return tokens;
  }

  async fetchUserInfo(accessToken) {
    const fetch = require('node-fetch');
    
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const userInfo = await response.json();
    
    if (!response.ok) {
      throw new Error(`User info fetch failed: ${userInfo.error?.message || 'Unknown error'}`);
    }

    return userInfo;
  }

  async fetchCalendars(accessToken) {
    const fetch = require('node-fetch');
    
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Calendar fetch failed: ${data.error?.message || 'Unknown error'}`);
    }

    return data;
  }

  stop() {
    if (this.server && this.isRunning) {
      this.server.close();
      this.isRunning = false;
      console.log('✅ OAuth server stopped');
    }
  }
}

// Global instance
let globalServer = null;

async function startOAuthServer() {
  if (!globalServer) {
    globalServer = new StandaloneOAuthServer();
  }
  
  return await globalServer.start();
}

function stopOAuthServer() {
  if (globalServer) {
    globalServer.stop();
    globalServer = null;
  }
}

module.exports = {
  startOAuthServer,
  stopOAuthServer,
  StandaloneOAuthServer
};