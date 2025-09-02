const express = require('express');
const { google } = require('googleapis');
const supabase = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// In-memory store for OAuth tokens by state (for desktop client)
// TODO: Move to Redis or database for production scaling
const tokensByState = {};

// Initialize Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Start Google OAuth flow
router.get('/', (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const state = JSON.stringify({ userId, random: uuidv4() });
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    state: state,
    prompt: 'consent' // Force consent to get refresh token
  });

  res.redirect(authUrl);
});

// Handle Google OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' });
    }

    if (!state) {
      return res.status(400).json({ error: 'State parameter not provided' });
    }

    let parsedState;
    try {
      parsedState = JSON.parse(state);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    const { userId } = parsedState;

    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in state' });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      return res.status(400).json({ error: 'Failed to obtain access token' });
    }

    // Update user record with Google tokens
    const { data, error } = await supabase
      .from('users')
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to save Google tokens' });
    }

    // Test the Google Calendar API connection
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
      // Get user's primary calendar to verify access
      const calendarList = await calendar.calendarList.list();
      const primaryCalendar = calendarList.data.items.find(cal => cal.primary);

      res.json({
        success: true,
        message: 'Google Calendar integration successful',
        calendar: primaryCalendar ? primaryCalendar.summary : 'Primary Calendar',
        userId: userId
      });

    } catch (calendarError) {
      console.error('Calendar API error:', calendarError);
      res.status(500).json({ error: 'Failed to verify Google Calendar access' });
    }

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Internal server error during Google OAuth' });
  }
});

// OAuth2 callback for desktop client (production server polling)
router.get('/oauth2callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    console.log('[OAuth2Callback] Received callback:', { code: !!code, state });

    if (!code) {
      console.error('[OAuth2Callback] No authorization code provided');
      return res.status(400).send('❌ Authorization code not provided');
    }

    if (!state) {
      console.error('[OAuth2Callback] No state parameter provided');
      return res.status(400).send('❌ State parameter not provided');
    }

    // Create OAuth2 client with production redirect URI
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://synk-official.com/oauth2callback'
    );

    console.log('[OAuth2Callback] Exchanging code for tokens...');
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      console.error('[OAuth2Callback] Failed to obtain access token');
      return res.status(400).send('❌ Failed to obtain access token');
    }

    console.log('[OAuth2Callback] Tokens obtained successfully');

    // Store tokens temporarily in memory under the given state
    tokensByState[state] = tokens;
    
    console.log('[OAuth2Callback] Tokens stored for state:', state);

    // Set a cleanup timeout (5 minutes)
    setTimeout(() => {
      if (tokensByState[state]) {
        console.log('[OAuth2Callback] Cleaning up expired tokens for state:', state);
        delete tokensByState[state];
      }
    }, 5 * 60 * 1000);

    // Respond with success message
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Account Linked</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .success { background: #4CAF50; color: white; padding: 20px; border-radius: 8px; display: inline-block; }
          .icon { font-size: 48px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="success">
          <div class="icon">✅</div>
          <h2>Google Account Linked Successfully!</h2>
          <p>You can close this tab and return to the Synk app.</p>
        </div>
        <script>
          // Auto-close after 3 seconds
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('[OAuth2Callback] Error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Error</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .error { background: #f44336; color: white; padding: 20px; border-radius: 8px; display: inline-block; }
          .icon { font-size: 48px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="error">
          <div class="icon">❌</div>
          <h2>OAuth Failed</h2>
          <p>Please try again in the Synk app.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// Refresh Google access token
async function refreshGoogleToken(userId) {
  try {
    // Get user's refresh token
    const { data: user, error } = await supabase
      .from('users')
      .select('google_refresh_token')
      .eq('id', userId)
      .single();

    if (error || !user || !user.google_refresh_token) {
      throw new Error('No refresh token found for user');
    }

    oauth2Client.setCredentials({
      refresh_token: user.google_refresh_token
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update the access token in database
    await supabase
      .from('users')
      .update({
        google_access_token: credentials.access_token,
        google_token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    return credentials.access_token;

  } catch (error) {
    console.error('Error refreshing Google token:', error);
    throw error;
  }
}

// Get authenticated Google Calendar client for a user
async function getGoogleCalendarClient(userId) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    if (!user.google_access_token) {
      throw new Error('No Google access token found');
    }

    // Check if token is expired
    const now = new Date();
    const expiry = user.google_token_expiry ? new Date(user.google_token_expiry) : null;
    
    let accessToken = user.google_access_token;

    if (expiry && now >= expiry) {
      // Token is expired, refresh it
      accessToken = await refreshGoogleToken(userId);
    }

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    client.setCredentials({
      access_token: accessToken,
      refresh_token: user.google_refresh_token
    });

    return google.calendar({ version: 'v3', auth: client });

  } catch (error) {
    console.error('Error getting Google Calendar client:', error);
    throw error;
  }
}

// API endpoint for desktop client polling
router.get('/api/oauth/result', async (req, res) => {
  try {
    const { state } = req.query;
    
    console.log('[OAuth Result] Polling request for state:', state);

    if (!state) {
      console.log('[OAuth Result] No state parameter provided');
      return res.json({ status: 'error', error: 'missing_state' });
    }

    const tokens = tokensByState[state];

    if (!tokens) {
      console.log('[OAuth Result] No tokens found for state:', state);
      return res.json({ status: 'pending' });
    }

    console.log('[OAuth Result] Tokens found, fetching calendars...');

    try {
      // Create OAuth2 client and set credentials
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://synk-official.com/oauth2callback'
      );
      oauth2Client.setCredentials(tokens);

      // Fetch user's calendars
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const result = await calendar.calendarList.list();
      const calendars = result.data.items || [];

      console.log('[OAuth Result] Successfully fetched calendars:', calendars.length);

      // Clean up tokens after successful use
      delete tokensByState[state];
      console.log('[OAuth Result] Cleaned up tokens for state:', state);

      // Return calendars in the format expected by the desktop client
      return res.json({
        status: 'ready',
        calendars: calendars.map(cal => ({
          id: cal.id,
          name: cal.summary,
          summary: cal.summary,
          primary: cal.primary || false,
          accessRole: cal.accessRole || 'reader',
          timeZone: cal.timeZone || 'UTC'
        }))
      });

    } catch (calendarError) {
      console.error('[OAuth Result] Calendar API error:', calendarError);
      
      // Clean up tokens on error
      delete tokensByState[state];
      
      return res.json({ 
        status: 'error', 
        error: 'calendar_fetch_failed',
        details: calendarError.message 
      });
    }

  } catch (error) {
    console.error('[OAuth Result] Unexpected error:', error);
    return res.json({ 
      status: 'error', 
      error: 'server_error',
      details: error.message 
    });
  }
});

// Test Google Calendar connection
router.get('/test/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const calendar = await getGoogleCalendarClient(userId);
    const calendarList = await calendar.calendarList.list();
    
    res.json({
      success: true,
      calendars: calendarList.data.items.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary || false
      }))
    });

  } catch (error) {
    console.error('Google Calendar test error:', error);
    res.status(500).json({ error: 'Failed to connect to Google Calendar' });
  }
});

module.exports = router;
module.exports.getGoogleCalendarClient = getGoogleCalendarClient;