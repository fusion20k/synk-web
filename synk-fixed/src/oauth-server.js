// Standalone OAuth server that handles the complete flow
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

class OAuthServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.port = null;
    this.mainWindow = null;
    this.tokens = null;
    this.calendars = null;
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  setupRoutes() {
    // Enable CORS for all routes
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        port: this.port,
        hasTokens: !!this.tokens,
        hasCalendars: !!this.calendars
      });
    });

    // Main OAuth callback route - handles everything
    this.app.get('/oauth2callback', async (req, res) => {
      console.log('📥 OAuth callback received');
      
      const { code, error, state } = req.query;
      
      if (error) {
        console.error('❌ OAuth error:', error);
        return res.status(400).send("Authorization failed: " + error);
      }

      if (!code) {
        console.error('❌ No authorization code provided');
        return res.status(400).send("Missing authorization code");
      }

      try {
        console.log('🔄 Starting complete OAuth flow...');
        
        // 1) Exchange code for tokens
        console.log('🔄 Exchanging code for tokens...');
        const DEMO_MODE = process.env.DEMO_MODE === 'true';
        const GOOGLE_CLIENT_ID = DEMO_MODE ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
        const GOOGLE_CLIENT_SECRET = DEMO_MODE ? process.env.GOOGLE_CLIENT_SECRET_DEMO : process.env.GOOGLE_CLIENT_SECRET;
        const GOOGLE_REDIRECT_URI = DEMO_MODE ? process.env.GOOGLE_REDIRECT_URI_DEMO : process.env.GOOGLE_REDIRECT_URI;

        const { data: tokenData } = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI, // must be https://synk-official.com/oauth2callback
          grant_type: 'authorization_code',
          code,
        });
        
        console.log('✅ Token exchange successful');
        
        // 2) Save tokens
        this.saveTokens(tokenData);
        console.log('✅ Tokens saved');
        
        // 3) Fetch calendar list with access token
        console.log('🔄 Fetching calendars...');
        const { data: calendars } = await axios.get(
          'https://www.googleapis.com/calendar/v3/users/me/calendarList',
          { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
        );
        console.log(`✅ Calendars fetched: ${calendars.items?.length || 0} calendars`);
        
        // 4) Send calendars to Electron app via multiple methods
        if (this.mainWindow && this.mainWindow.webContents) {
          console.log('📤 Sending calendars to Electron app via IPC');
          this.mainWindow.webContents.send('google:calendars', calendars);
          console.log('✅ Calendars sent to app via IPC');
        } else {
          console.log('⚠️ No main window available for IPC');
        }
        
        // 5) Also redirect to custom protocol as backup
        const calendarData = encodeURIComponent(JSON.stringify(calendars));
        const protocolUrl = `synk://oauth-success?data=${calendarData}`;
        console.log('📤 Redirecting to custom protocol:', protocolUrl);
        
        // 6) Close the OAuth browser tab gracefully with redirect
        res.send(`
          <script>
            console.log('OAuth flow completed successfully');
            console.log('Redirecting to app...');
            window.location.href = '${protocolUrl}';
            setTimeout(() => window.close(), 1000);
          </script>
        `);
        
      } catch (error) {
        console.error('❌ OAuth flow failed:', error.response?.data || error.message);
        res.status(500).send('OAuth flow failed, check logs.');
      }
    });

    // Endpoint to get stored calendars
    this.app.get('/calendars', (req, res) => {
      if (!this.calendars) {
        return res.status(404).json({ error: 'No calendars available' });
      }
      res.json(this.calendars);
    });

    // Endpoint to get stored tokens
    this.app.get('/tokens', (req, res) => {
      if (!this.tokens) {
        return res.status(404).json({ error: 'No tokens available' });
      }
      res.json({ 
        hasTokens: true,
        expires_in: this.tokens.expires_in,
        scope: this.tokens.scope
      });
    });

    // Endpoint to receive complete OAuth data from callback page
    this.app.post('/oauth-complete', (req, res) => {
      console.log('📥 Received complete OAuth data from callback page');
      
      try {
        const { tokens, calendars, state } = req.body;
        
        if (!tokens || !calendars) {
          console.error('❌ Invalid OAuth data received');
          return res.status(400).json({ error: 'Invalid OAuth data' });
        }
        
        // Save tokens and calendars
        this.saveTokens(tokens);
        this.calendars = calendars;
        
        console.log('✅ OAuth data saved successfully');
        console.log(`📅 Calendars: ${calendars.items?.length || 0} found`);
        
        // Send calendars to Electron app
        this.sendCalendarsToApp(calendars);
        
        res.json({ success: true, message: 'OAuth data received and processed' });
        
      } catch (error) {
        console.error('❌ Error processing OAuth data:', error);
        res.status(500).json({ error: 'Failed to process OAuth data' });
      }
    });

    // Handle preflight requests for CORS
    this.app.options('/oauth-complete', (req, res) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.sendStatus(200);
    });
  }

  async exchangeCodeForTokens(code) {
    const DEMO_MODE = process.env.DEMO_MODE === 'true';
    const GOOGLE_CLIENT_ID = DEMO_MODE ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = DEMO_MODE ? process.env.GOOGLE_CLIENT_SECRET_DEMO : process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_REDIRECT_URI = DEMO_MODE ? process.env.GOOGLE_REDIRECT_URI_DEMO : process.env.GOOGLE_REDIRECT_URI;

    console.log('🔄 Token exchange request to Google...');
    
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
      code: code
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      transformRequest: [(data) => {
        return Object.keys(data)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
          .join('&');
      }]
    });

    if (!response.data.access_token) {
      throw new Error('No access token received from Google');
    }

    return response;
  }

  saveTokens(tokenData) {
    this.tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      token_type: tokenData.token_type,
      expires_at: Date.now() + (tokenData.expires_in * 1000)
    };
    
    console.log('💾 Tokens saved:', {
      access_token: this.tokens.access_token ? 'Present' : 'Missing',
      refresh_token: this.tokens.refresh_token ? 'Present' : 'Missing',
      expires_in: this.tokens.expires_in,
      scope: this.tokens.scope
    });
  }

  async fetchCalendars(accessToken) {
    console.log('📅 Fetching calendars from Google...');
    
    const response = await axios.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.data || !response.data.items) {
      throw new Error('Invalid calendar response from Google');
    }

    this.calendars = response.data;
    return response.data;
  }

  sendCalendarsToApp(calendars) {
    if (this.mainWindow && this.mainWindow.webContents) {
      console.log('📤 Sending calendars to Electron frontend via IPC');
      this.mainWindow.webContents.send('google:calendars', calendars);
    } else {
      console.log('⚠️ No main window available to send calendars');
    }
  }

  async start(port = 3000) {
    if (this.server) {
      console.log(`OAuth server already running on port ${this.port}`);
      return this.port;
    }

    this.setupRoutes();

    return new Promise((resolve, reject) => {
      const tryListen = (currentPort) => {
        this.server = this.app.listen(currentPort, '127.0.0.1', () => {
          this.port = currentPort;
          console.log(`✅ OAuth server started on http://127.0.0.1:${currentPort}`);
          resolve(currentPort);
        });
        
        this.server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
            this.server = null;
            tryListen(currentPort + 1);
          } else {
            reject(new Error(`Server error: ${error.message}`));
          }
        });
      };
      
      tryListen(port);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.port = null;
      console.log('✅ OAuth server stopped');
    }
  }

  getTokens() {
    return this.tokens;
  }

  getCalendars() {
    return this.calendars;
  }
}

// Global instance
let globalOAuthServer = null;

async function startOAuthServer(mainWindow = null) {
  if (!globalOAuthServer) {
    globalOAuthServer = new OAuthServer();
  }
  
  if (mainWindow) {
    globalOAuthServer.setMainWindow(mainWindow);
  }
  
  const port = await globalOAuthServer.start();
  return { server: globalOAuthServer, port };
}

function getOAuthServer() {
  return globalOAuthServer;
}

function stopOAuthServer() {
  if (globalOAuthServer) {
    globalOAuthServer.stop();
    globalOAuthServer = null;
  }
}

module.exports = {
  startOAuthServer,
  getOAuthServer,
  stopOAuthServer,
  OAuthServer
};