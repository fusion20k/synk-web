// Note: shell will be passed as parameter to avoid requiring electron in main process
const keytar = require('keytar');
const fetch = require('node-fetch');
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');
const { google } = require('googleapis');
const express = require('express');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

// Define Google Calendar scopes - exactly as specified
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events"
];

// OAuth Configuration from environment variables
const OAUTH_CONFIG = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: 'https://synk-official.com/oauth2callback',
    scopes: SCOPES
  },
  notion: {
    secret: process.env.NOTION_SECRET
  }
};

// Validate required environment variables
const requiredVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'NOTION_SECRET'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.error('Please check your .env.production file');
}

// Centralized OAuth server manager to prevent port conflicts
class OAuthServerManager {
  constructor() {
    this.server = null;
    this.currentPort = null;
    this.activeFlows = new Map(); // Track active OAuth flows
  }

  async startServer() {
    if (this.server && this.server.listening) {
      console.log(`OAuth server already running on port ${this.currentPort}`);
      return this.currentPort;
    }

    // Get port from .env or default to 3000
    let port = parseInt(process.env.OAUTH_PORT) || 3000;
    
    return new Promise((resolve, reject) => {
      this.server = http.createServer();
      
      const tryListen = (currentPort) => {
        this.server.listen(currentPort, '127.0.0.1', () => {
          this.currentPort = currentPort;
          console.log(`Centralized OAuth server started on port ${currentPort}`);
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

  registerFlow(service, state, resolver, rejecter) {
    this.activeFlows.set(state, { service, resolver, rejecter });
    console.log(`Registered ${service} OAuth flow with state: ${state}`);
  }

  setupRequestHandler() {
    if (!this.server) return;

    this.server.on('request', async (req, res) => {
      const url = new URL(req.url, `http://localhost:${this.currentPort}`);
      
      // Handle unified OAuth callback (modern approach)
      if (url.pathname === '/oauth2callback') {
        await this.handleUnifiedCallback(req, res);
      }
      // Handle legacy Google OAuth callback
      else if (url.pathname === '/oauth/google/callback') {
        await this.handleCallback(req, res, 'google');
      }
      // Handle legacy Notion OAuth callback  
      else if (url.pathname === '/oauth/notion/callback') {
        await this.handleCallback(req, res, 'notion');
      }
      else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
  }

  async handleUnifiedCallback(req, res) {
    const url = new URL(req.url, `http://localhost:${this.currentPort}`);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Send minimal response to close the browser tab immediately
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Synk - Authorization Complete</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #111; color: #fff; }
            .success { color: #4CAF50; }
            .error { color: #f44336; }
          </style>
        </head>
        <body>
          <h2 class="${error ? 'error' : 'success'}">${error ? 'Authorization Failed' : 'Authorization Successful!'}</h2>
          <p>${error ? `Error: ${error}` : 'Returning to Synk app...'}</p>
          <script>
            // Close this tab and return focus to the app
            setTimeout(() => {
              window.close();
            }, 1000);
          </script>
        </body>
      </html>
    `);

    // Find the OAuth flow by state to determine service
    const flow = this.activeFlows.get(state);
    if (!flow) {
      console.error(`No active flow found for state: ${state}`);
      return;
    }

    // Remove the flow from active flows
    this.activeFlows.delete(state);

    if (error) {
      flow.rejecter(new Error(`OAuth error: ${error}`));
      return;
    }

    if (!code) {
      flow.rejecter(new Error('No authorization code received'));
      return;
    }

    try {
      let result;
      if (flow.service === 'google') {
        result = await this.processGoogleCallback(code, state);
      } else if (flow.service === 'notion') {
        result = await this.processNotionCallback(code, state);
      } else {
        throw new Error(`Unknown service: ${flow.service}`);
      }
      
      flow.resolver(result);
    } catch (callbackError) {
      console.error(`OAuth callback error for ${flow.service}:`, callbackError);
      flow.rejecter(callbackError);
    }
  }

  async handleCallback(req, res, service) {
    const url = new URL(req.url, `http://localhost:${this.currentPort}`);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Send response to browser first
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Synk - ${service.charAt(0).toUpperCase() + service.slice(1)} Authorization</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #4CAF50; }
            .error { color: #f44336; }
          </style>
        </head>
        <body>
          <h2>${error ? 'Authorization Failed' : 'Authorization Successful!'}</h2>
          <p>${error ? `Error: ${error}` : 'You can close this window and return to Synk.'}</p>
          <script>window.close();</script>
        </body>
      </html>
    `);

    // Find and handle the OAuth flow
    const flow = this.activeFlows.get(state);
    if (!flow) {
      console.error(`No active flow found for state: ${state}`);
      return;
    }

    // Remove the flow from active flows
    this.activeFlows.delete(state);

    if (error) {
      flow.rejecter(new Error(`OAuth error: ${error}`));
      return;
    }

    if (!code) {
      flow.rejecter(new Error('No authorization code received'));
      return;
    }

    // Process the OAuth flow based on service
    try {
      let result;
      if (service === 'google') {
        result = await this.processGoogleCallback(code, state);
      } else if (service === 'notion') {
        result = await this.processNotionCallback(code, state);
      }
      
      flow.resolver(result);
    } catch (callbackError) {
      flow.rejecter(callbackError);
    }
  }

  async processGoogleCallback(code, state) {
    // Use the configured redirect URI from .env (must match auth URL)
    const actualRedirectUri = GOOGLE_REDIRECT_URI;
    
    // Get the stored code verifier for this state
    const codeVerifier = this.getCodeVerifier(state);
    
    // Use the new token exchange function
    const tokens = await exchangeGoogleCodeForTokens({
      code,
      redirectUri: actualRedirectUri,
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      codeVerifier
    });
    
    if (tokens.access_token) {
      // Get user info only if we have openid scope (which we don't by default now)
      let userInfo = null;
      if (tokens.scope && tokens.scope.includes('openid')) {
        try {
          const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${tokens.access_token}` }
          });
          userInfo = await userResponse.json();
        } catch (err) {
          console.warn('Could not fetch user info:', err.message);
        }
      }
      
      // Store tokens securely
      const tokenData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        expires_at: Date.now() + (tokens.expires_in * 1000), // Calculate expiration timestamp
        token_type: tokens.token_type,
        scope: tokens.scope,
        user_info: userInfo
      };
      
      await keytar.setPassword(SERVICE, GOOGLE_ACCOUNT, JSON.stringify(tokenData));
      console.log('✅ Google OAuth completed successfully');
      
      // Immediately fetch calendar data to stop loading spinner
      try {
        console.log('[OAuth] Tokens received, about to fetch calendars...');
        console.log('[OAuth] Access token present:', !!tokens.access_token);
        console.log('[OAuth] Token scopes:', tokens.scope);
        
        const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('[OAuth] Calendar API response status:', calendarsResponse.status);
        console.log('[OAuth] Calendar API response ok:', calendarsResponse.ok);

        if (calendarsResponse.ok) {
          const calendarsData = await calendarsResponse.json();
          console.log('[OAuth] Raw calendar data received:', {
            hasItems: !!calendarsData.items,
            itemCount: calendarsData.items?.length,
            firstItem: calendarsData.items?.[0]
          });
          
          const calendars = calendarsData.items.map(cal => ({
            id: cal.id,
            name: cal.summary,
            primary: cal.primary || false,
            accessRole: cal.accessRole,
            backgroundColor: cal.backgroundColor,
            description: cal.description,
            timeZone: cal.timeZone
          }));
          
          console.log(`[OAuth] Successfully processed ${calendars.length} calendars`);
          console.log('[OAuth] Calendar preview:', calendars.slice(0, 2));
          return { ok: true, user: userInfo, tokens: tokenData, calendars: calendars };
        } else {
          const errorText = await calendarsResponse.text();
          console.error('[OAuth] Calendar API error:', calendarsResponse.status, errorText);
          return { ok: true, user: userInfo, tokens: tokenData, calendars: [] };
        }
      } catch (calendarError) {
        console.error('[OAuth] Calendar fetch exception:', calendarError);
        console.error('[OAuth] Calendar fetch stack:', calendarError.stack);
        return { ok: true, user: userInfo, tokens: tokenData, calendars: [] };
      }
    } else {
      throw new Error(`Token exchange failed: ${tokens.error_description || tokens.error}`);
    }
  }

  async processNotionCallback(code, state) {
    // Use the configured redirect URI from .env (must match auth URL)
    const actualRedirectUri = NOTION_REDIRECT_URI;
    
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: actualRedirectUri
      })
    });

    const tokens = await tokenResponse.json();
    
    if (tokens.access_token) {
      // Store tokens securely
      const tokenData = {
        access_token: tokens.access_token,
        token_type: tokens.token_type,
        bot_id: tokens.bot_id,
        workspace_name: tokens.workspace_name,
        workspace_icon: tokens.workspace_icon,
        workspace_id: tokens.workspace_id,
        owner: tokens.owner
      };
      
      await keytar.setPassword(SERVICE, NOTION_ACCOUNT, JSON.stringify(tokenData));
      console.log('✅ Notion OAuth completed successfully');
      
      return { ok: true, workspace: tokens.workspace_name, tokens: tokenData };
    } else {
      throw new Error(`Token exchange failed: ${tokens.error_description || tokens.error}`);
    }
  }

  // Store and retrieve code verifiers for PKCE
  storeCodeVerifier(state, codeVerifier) {
    this._codeVerifiers = this._codeVerifiers || new Map();
    this._codeVerifiers.set(state, codeVerifier);
  }

  getCodeVerifier(state) {
    this._codeVerifiers = this._codeVerifiers || new Map();
    const verifier = this._codeVerifiers.get(state);
    this._codeVerifiers.delete(state); // Clean up
    return verifier;
  }

  stopServer() {
    if (this.server && this.server.listening) {
      console.log('Stopping OAuth server...');
      this.server.close();
      this.server = null;
      this.currentPort = null;
      this.activeFlows.clear();
    }
  }
}

// Global OAuth server instance
const oauthServerManager = new OAuthServerManager();

// Environment variables should already be loaded by main.js
const SERVICE = 'Synk';
const GOOGLE_ACCOUNT = 'google-oauth';
const NOTION_ACCOUNT = 'notion-oauth';

// Google OAuth Configuration - Production only
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Force production redirect URI
const redirectUri = "https://synk-official.com/oauth2callback";
const GOOGLE_REDIRECT_URI = redirectUri;

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  redirectUri
);

// Express app for OAuth callback
const app = express();
let mainWindow = null;
let server = null;

// Set main window reference
function setMainWindow(window) {
  mainWindow = window;
}

// Start Express server
function startOAuthServer(port = 3000) {
  if (server) {
    console.log('[OAuth] Server already running');
    return Promise.resolve(port);
  }

  return new Promise((resolve, reject) => {
    server = app.listen(port, (err) => {
      if (err) {
        console.error('[OAuth] Failed to start server:', err);
        reject(err);
      } else {
        console.log(`[OAuth] Express server running on port ${port}`);
        resolve(port);
      }
    });
  });
}

// Note: Server will be started by the OAuth flow when needed

// Notion OAuth Configuration - Production only
const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET;
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI;

// PKCE helper functions
function base64UrlEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeCodeVerifier() {
  return base64UrlEncode(crypto.randomBytes(32));
}

function makeCodeChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64UrlEncode(hash);
}

// Legacy function names for compatibility
function generateCodeVerifier() {
  return makeCodeVerifier();
}

function generateCodeChallenge(verifier) {
  return makeCodeChallenge(verifier);
}

function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

// Call this when starting Google OAuth
async function buildGoogleAuthUrl({ redirectUri, clientId }) {
  const codeVerifier = makeCodeVerifier();
  const codeChallenge = makeCodeChallenge(codeVerifier);
  const state = generateState();

  const scopeParam = encodeURIComponent(GOOGLE_SCOPES);

  const authUrl = [
    'https://accounts.google.com/o/oauth2/v2/auth',
    `?client_id=${encodeURIComponent(clientId)}`,
    `&redirect_uri=${encodeURIComponent(redirectUri)}`,
    `&response_type=code`,
    `&scope=${scopeParam}`,
    `&access_type=offline`,
    `&prompt=consent%20select_account`,      // force account selection + consent
    `&include_granted_scopes=true`,
    `&state=${encodeURIComponent(state)}`,
    `&code_challenge=${encodeURIComponent(codeChallenge)}`,
    `&code_challenge_method=S256`
  ].join('');

  return { authUrl, state, codeVerifier, codeChallenge };
}

// Token exchange function with PKCE
async function exchangeGoogleCodeForTokens({ code, redirectUri, clientId, clientSecret, codeVerifier }) {
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier
  });

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Google token exchange failed: ${r.status} ${text}`);
  }

  const tokens = await r.json();
  // tokens: access_token, expires_in, refresh_token (if access_type=offline and first consent), id_token (if requested)
  return tokens;
}

// Google OAuth via production server + polling
async function googleOAuthViaProduction(shellRef) {
  // Validate configuration
  if (!OAUTH_CONFIG.google.clientId || !OAUTH_CONFIG.google.clientSecret) {
    console.error('❌ Google OAuth not configured. Missing CLIENT_ID or CLIENT_SECRET');
    return { ok: false, error: 'oauth_not_configured' };
  }

  console.log('🚀 Starting Google OAuth via production server...');
  
  const state = crypto.randomBytes(16).toString('hex');
  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    `client_id=${encodeURIComponent(OAUTH_CONFIG.google.clientId)}&` +
    `redirect_uri=${encodeURIComponent(OAUTH_CONFIG.google.redirectUri)}&` +
    'response_type=code&' +
    `scope=${encodeURIComponent(OAUTH_CONFIG.google.scopes.join(' '))}&` +
    'access_type=offline&' +
    'prompt=consent%20select_account&' +
    `state=${encodeURIComponent(state)}`;

  console.log('[Client OAuth] Opening browser for Google authentication...');
  console.log('[Client OAuth] Redirect URI:', OAUTH_CONFIG.google.redirectUri);
  console.log('[Client OAuth] Scopes:', OAUTH_CONFIG.google.scopes.join(', '));

  // Open in system browser (new tab if browser already open)
  await shellRef.openExternal(authUrl);

  // Poll production server for result
  const pollEndpoint = `https://synk-official.com/api/oauth/result?state=${encodeURIComponent(state)}`;
  const maxMs = 2 * 60 * 1000; // 2 minutes
  const start = Date.now();

  console.log('[Client OAuth] Polling server for OAuth result...');
  console.log('[Client OAuth] Poll endpoint:', pollEndpoint);

  while (Date.now() - start < maxMs) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      console.log('[Client OAuth] Polling...', new Date().toISOString());
      const resp = await fetch(pollEndpoint, { method: 'GET' });
      if (!resp.ok) {
        console.log('[Client OAuth] Server not ready, continuing to poll...');
        continue;
      }
      const data = await resp.json();
      console.log('[Client OAuth] Server response:', data.status);
      
      if (data.status === 'pending') continue;
      if (data.status === 'ready') {
        console.log('[Client OAuth] ✅ Calendars received:', data.calendars?.length || 0);
        return { ok: true, calendars: data.calendars || [] };
      }
      if (data.status === 'error') {
        console.error('[Client OAuth] ❌ Server error:', data.error);
        return { ok: false, error: data.error || 'server_error' };
      }
    } catch (err) {
      console.error('[Client OAuth] Polling error:', err.message);
      // continue polling until timeout
    }
  }

  console.error('[Client OAuth] ❌ Timeout after 2 minutes');
  return { ok: false, error: 'timeout' };
}

// Legacy function for backward compatibility - calls the new implementation
async function googleOAuth(shell) {
  const result = await googleOAuthViaProduction(shell);
  if (result.ok) {
    return { 
      success: true, 
      calendars: result.calendars,
      message: 'OAuth flow completed successfully.' 
    };
  } else {
    throw new Error(result.error || 'OAuth failed');
  }
}

async function notionOAuth(shell) {
  return new Promise(async (resolve, reject) => {
    // Check if Notion OAuth credentials are configured
    if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) {
      reject(new Error('Notion OAuth credentials not configured. Please check your .env file.'));
      return;
    }

    console.log(`Notion OAuth starting in PRODUCTION mode`);

    // Generate state for security
    const state = generateState();

    try {
      // Start centralized OAuth server
      const port = await oauthServerManager.startServer();
      oauthServerManager.setupRequestHandler();
      
      // Register this OAuth flow
      oauthServerManager.registerFlow('notion', state, resolve, reject);
      
      // Use the configured redirect URI from .env (not dynamic port)
      const redirectUri = NOTION_REDIRECT_URI;

      // Build the authorization URL
      const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
      authUrl.searchParams.set('client_id', NOTION_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('owner', 'user');
      authUrl.searchParams.set('state', state);

      console.log('Opening Notion OAuth URL:', authUrl.toString());

      // Open the authorization URL in the default browser
      shell.openExternal(authUrl.toString());
      
    } catch (error) {
      reject(error);
    }
  });
}

async function getGoogleToken() {
  try {
    const tokenString = await keytar.getPassword(SERVICE, GOOGLE_ACCOUNT);
    if (!tokenString) {
      throw new Error('No Google token found. Please connect your Google account first.');
    }
    
    const tokenData = JSON.parse(tokenString);
    
    // Check if token is expired
    if (tokenData.expires_at && Date.now() >= tokenData.expires_at) {
      // Try to refresh the token
      if (tokenData.refresh_token) {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            refresh_token: tokenData.refresh_token,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token'
          })
        });

        const refreshData = await refreshResponse.json();
        
        if (refreshData.access_token) {
          // Update stored token
          tokenData.access_token = refreshData.access_token;
          tokenData.expires_in = refreshData.expires_in;
          tokenData.expires_at = Date.now() + (refreshData.expires_in * 1000);
          
          await keytar.setPassword(SERVICE, GOOGLE_ACCOUNT, JSON.stringify(tokenData));
          console.log('Google token refreshed successfully');
        } else {
          throw new Error('Failed to refresh Google token');
        }
      } else {
        throw new Error('Google token expired and no refresh token available');
      }
    }
    
    return tokenData;
  } catch (error) {
    console.error('Error getting Google token:', error);
    throw error;
  }
}

async function getNotionToken() {
  try {
    const tokenString = await keytar.getPassword(SERVICE, NOTION_ACCOUNT);
    if (!tokenString) {
      throw new Error('No Notion token found. Please connect your Notion account first.');
    }
    
    return JSON.parse(tokenString);
  } catch (error) {
    console.error('Error getting Notion token:', error);
    throw error;
  }
}

// Note: OAuth callback is now handled by the production server at synk-official.com
// The desktop app polls the production server for results instead of handling callbacks locally

module.exports = {
  googleOAuth,
  googleOAuthViaProduction,
  notionOAuth,
  getGoogleToken,
  getNotionToken,
  setMainWindow,
  startOAuthServer,
  app
};