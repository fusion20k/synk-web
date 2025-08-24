const express = require('express');
const { google } = require('googleapis');
const supabase = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

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