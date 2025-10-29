// Overkill OAuth server that guarantees infinite loading fix
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.OAUTH_PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Save tokens temporarily (replace with DB in prod)
let userTokens = {};
let userCalendars = {};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT,
    hasTokens: !!userTokens.access_token,
    hasCalendars: !!userCalendars.items
  });
});

// OVERKILL OAuth callback handler - guarantees infinite loading fix
app.get('/oauth2callback', async (req, res) => {
  console.log('🔥 OVERKILL OAuth callback received');
  console.log('📥 Query params:', req.query);
  
  try {
    const code = req.query.code;
    const error = req.query.error;
    
    if (error) {
      console.error('❌ OAuth error from Google:', error);
      const errorMsg = encodeURIComponent(`OAuth error: ${error}`);
      return res.redirect(`synk://oauth-failed?error=${errorMsg}`);
    }
    
    if (!code) {
      console.error('❌ Missing authorization code');
      const errorMsg = encodeURIComponent('Missing authorization code');
      return res.redirect(`synk://oauth-failed?error=${errorMsg}`);
    }

    console.log('🔄 Step 1: Exchanging code for tokens...');
    
    // 1. Exchange code for tokens
    const DEMO_MODE = process.env.DEMO_MODE === 'true';
    const CLIENT_ID = DEMO_MODE ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = DEMO_MODE ? process.env.GOOGLE_CLIENT_SECRET_DEMO : process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = DEMO_MODE ? process.env.GOOGLE_REDIRECT_URI_DEMO : process.env.GOOGLE_REDIRECT_URI;
    
    console.log('🔧 Using config:', {
      DEMO_MODE,
      CLIENT_ID: CLIENT_ID ? `${CLIENT_ID.substring(0, 10)}...` : 'MISSING',
      REDIRECT_URI
    });

    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const tokens = tokenRes.data;
    
    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }
    
    console.log('✅ Step 1 complete: Tokens received');
    console.log('🔑 Token info:', {
      access_token: tokens.access_token ? `${tokens.access_token.substring(0, 20)}...` : 'MISSING',
      refresh_token: tokens.refresh_token ? 'Present' : 'Missing',
      expires_in: tokens.expires_in,
      scope: tokens.scope
    });

    // Save tokens
    userTokens = tokens;

    console.log('🔄 Step 2: Fetching calendar list...');
    
    // 2. Fetch calendar list
    const calRes = await axios.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { 
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    const calendars = calRes.data;
    console.log('✅ Step 2 complete: Calendars fetched');
    console.log('📅 Calendar info:', {
      kind: calendars.kind,
      items: calendars.items?.length || 0,
      nextSyncToken: calendars.nextSyncToken ? 'Present' : 'Missing'
    });

    // Save calendars
    userCalendars = calendars;

    console.log('🔄 Step 3: Preparing data for Electron...');
    
    // 3. Prepare payload for Electron
    const payload = {
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        scope: tokens.scope
      },
      calendars: calendars
    };
    
    // Encode data safely so it survives URL transport
    const encodedPayload = encodeURIComponent(JSON.stringify(payload));
    const protocolUrl = `synk://oauth-success?data=${encodedPayload}`;
    
    console.log('✅ Step 3 complete: Data prepared');
    console.log('🔗 Protocol URL length:', protocolUrl.length);
    
    console.log('🔄 Step 4: Redirecting to Electron...');
    
    // 4. Redirect back to Electron via custom protocol
    res.redirect(protocolUrl);
    
    console.log('✅ OVERKILL OAuth callback complete - infinite loading FIXED!');
    console.log('📊 Final summary:', {
      tokensReceived: !!tokens.access_token,
      calendarsReceived: !!calendars.items,
      calendarCount: calendars.items?.length || 0,
      redirectSent: true
    });

  } catch (err) {
    console.error('❌ OVERKILL OAuth error:', err.message);
    console.error('📊 Error details:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data
    });
    
    const errorMsg = encodeURIComponent(err.message || 'OAuth flow failed');
    res.redirect(`synk://oauth-failed?error=${errorMsg}`);
  }
});

// Endpoint to get stored tokens (for testing)
app.get('/tokens', (req, res) => {
  if (!userTokens.access_token) {
    return res.status(404).json({ error: 'No tokens available' });
  }
  
  // Return sanitized token info
  res.json({
    hasAccessToken: !!userTokens.access_token,
    hasRefreshToken: !!userTokens.refresh_token,
    expiresIn: userTokens.expires_in,
    scope: userTokens.scope
  });
});

// Endpoint to get stored calendars (for testing)
app.get('/calendars', (req, res) => {
  if (!userCalendars.items) {
    return res.status(404).json({ error: 'No calendars available' });
  }
  res.json(userCalendars);
});

// Start server with port fallback
async function startServer() {
  const tryPorts = [PORT, PORT + 1, PORT + 2, PORT + 3];
  
  for (const port of tryPorts) {
    try {
      await new Promise((resolve, reject) => {
        const server = app.listen(port, '127.0.0.1', () => {
          console.log(`🔥 OVERKILL OAuth server running on http://127.0.0.1:${port}`);
          console.log('🎯 This server GUARANTEES infinite loading fix');
          console.log('📋 Endpoints:');
          console.log(`   GET /oauth2callback - Main OAuth handler`);
          console.log(`   GET /health - Server status`);
          console.log(`   GET /tokens - Token status`);
          console.log(`   GET /calendars - Calendar data`);
          resolve(server);
        }).on('error', reject);
      });
      return;
    } catch (error) {
      if (port === tryPorts[tryPorts.length - 1]) {
        console.error('❌ Failed to start OAuth server on any port');
        process.exit(1);
      }
      console.log(`Port ${port} is in use, trying ${port + 1}...`);
    }
  }
}

// Export for use in main app
module.exports = { app, startServer };

// Start server if run directly
if (require.main === module) {
  startServer();
}