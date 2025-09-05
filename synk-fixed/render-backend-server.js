// Complete Render Backend Server for Synk OAuth
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();

// At top of server file
const oauthResults = {}; // { state: { tokens, createdAt } }
console.log('[Server] BACKEND_URL=', process.env.BACKEND_URL || 'NOT SET');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure OAuth2 client uses BACKEND_URL env variable as redirect URI
const BACKEND_URL = process.env.BACKEND_URL || 'https://synk-backend.onrender.com';
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${BACKEND_URL}/oauth2callback`
);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Synk Backend Running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /oauth2callback - Google OAuth callback',
      'GET /api/oauth/result - OAuth polling endpoint',
      'GET /oauth-success - Success page',
      'GET /oauth-error - Error page'
    ]
  });
});

app.get('/oauth2callback', async (req, res) => {
  console.log('[OAuth2Callback] incoming request', { query: req.query });
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send('Missing code or state');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauthResults[state] = { tokens, createdAt: Date.now() };
    console.log('[OAuth2Callback] tokens stored for state:', state);
    return res.send('<html><body><h2>Synk connected — close this tab.</h2></body></html>');
  } catch (err) {
    console.error('[OAuth2Callback] token exchange error:', err && err.message);
    return res.status(500).send('OAuth token exchange failed');
  }
});

app.get('/api/oauth/result', (req, res) => {
  const { state } = req.query;
  console.log('[API.OAuthResult] poll request for state:', state);
  if (!state) return res.status(400).json({ error: 'missing_state' });

  const entry = oauthResults[state];
  if (!entry) {
    // return HTTP 200 with pending status (client expects status field)
    return res.status(200).json({ status: 'pending' });
  }

  const { tokens } = entry;
  // Optionally fetch calendars here if you want server to return them immediately.
  delete oauthResults[state];
  console.log('[API.OAuthResult] returning ready for state:', state);
  return res.status(200).json({ status: 'ready', tokens });
});

// Notion OAuth callback (if needed)
app.get('/oauth2callback/notion', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    console.log('📥 Notion OAuth callback received:', { code: !!code, state, error });
    
    if (error) {
      console.error('Notion OAuth error:', error);
      return res.redirect(`/oauth-error?error=${encodeURIComponent(error)}`);
    }
    
    if (!code || !state) {
      console.error('Missing code or state parameter for Notion');
      return res.redirect('/oauth-error?error=missing_parameters');
    }
    
    // TODO: Implement Notion token exchange
    console.log('🔄 Notion OAuth - token exchange not implemented yet');
    
    // For now, just redirect to success
    res.redirect('/oauth-success');
    
  } catch (error) {
    console.error('Notion OAuth callback error:', error);
    res.redirect(`/oauth-error?error=${encodeURIComponent(error.message)}`);
  }
});

// Success page
app.get('/oauth-success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>OAuth Success - Synk</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
            .success { color: #4CAF50; font-size: 48px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; margin-bottom: 30px; }
            .close-btn { background: #4CAF50; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px; }
            .close-btn:hover { background: #45a049; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success">✅</div>
            <h1>Authentication Successful!</h1>
            <p>You can now close this window and return to the Synk app.</p>
            <button class="close-btn" onclick="window.close()">Close Window</button>
        </div>
        <script>
            // Auto-close after 5 seconds
            setTimeout(() => {
                window.close();
            }, 5000);
        </script>
    </body>
    </html>
  `);
});

// Error page
app.get('/oauth-error', (req, res) => {
  const error = req.query.error || 'Unknown error';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>OAuth Error - Synk</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
            .error { color: #f44336; font-size: 48px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; margin-bottom: 30px; }
            .error-details { background: #ffebee; padding: 15px; border-radius: 5px; margin-bottom: 20px; color: #c62828; }
            .retry-btn { background: #2196F3; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 10px; }
            .close-btn { background: #666; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px; }
            .retry-btn:hover { background: #1976D2; }
            .close-btn:hover { background: #555; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error">❌</div>
            <h1>Authentication Failed</h1>
            <div class="error-details">
                Error: ${error}
            </div>
            <p>Please try again in the Synk app.</p>
            <button class="retry-btn" onclick="window.close()">Try Again</button>
            <button class="close-btn" onclick="window.close()">Close Window</button>
        </div>
    </body>
    </html>
  `);
});

app.get('/_health', (req, res) => res.json({ ok: true, host: BACKEND_URL }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Server] Listening on port ${PORT}`));

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down...');
  process.exit(0);
});

module.exports = app;