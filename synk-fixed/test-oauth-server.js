#!/usr/bin/env node

// Test OAuth server independently of Electron
require('dotenv').config();
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

console.log('🧪 Testing OAuth Server Independently');
console.log('====================================');

// Environment variables
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const GOOGLE_CLIENT_ID = DEMO_MODE ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = DEMO_MODE ? process.env.GOOGLE_CLIENT_SECRET_DEMO : process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = DEMO_MODE ? process.env.GOOGLE_REDIRECT_URI_DEMO : process.env.GOOGLE_REDIRECT_URI;

console.log('Environment check:');
console.log(`- DEMO_MODE: ${DEMO_MODE}`);
console.log(`- GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID ? 'Present' : 'Missing'}`);
console.log(`- GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing'}`);
console.log(`- GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI}`);

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('❌ Missing Google OAuth credentials');
  process.exit(1);
}

// Simple OAuth server
class TestOAuthServer {
  constructor() {
    this.server = null;
    this.port = 3000;
    this.activeFlows = new Map();
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        console.log(`✅ OAuth server started on http://127.0.0.1:${this.port}`);
        resolve(this.port);
      });

      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`Port ${this.port} in use, trying ${this.port + 1}...`);
          this.port++;
          this.server.listen(this.port, '127.0.0.1');
        } else {
          reject(error);
        }
      });
    });
  }

  handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${this.port}`);
    console.log(`📥 Request: ${req.method} ${url.pathname}`);

    if (url.pathname === '/oauth2callback') {
      this.handleOAuthCallback(req, res, url);
    } else if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', port: this.port }));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }

  async handleOAuthCallback(req, res, url) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log(`📋 OAuth callback received:`, { code: !!code, state, error });

    // Send response to browser
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Test - ${error ? 'Failed' : 'Success'}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #111; color: #fff; }
            .success { color: #4CAF50; }
            .error { color: #f44336; }
          </style>
        </head>
        <body>
          <h2 class="${error ? 'error' : 'success'}">${error ? 'OAuth Failed' : 'OAuth Success!'}</h2>
          <p>${error ? `Error: ${error}` : 'Authorization code received successfully'}</p>
          <p>Code: ${code ? code.substring(0, 20) + '...' : 'None'}</p>
          <p>State: ${state || 'None'}</p>
          <script>setTimeout(() => window.close(), 3000);</script>
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

    // Test token exchange
    try {
      console.log('🔄 Testing token exchange...');
      const tokens = await this.exchangeCodeForTokens(code);
      console.log('✅ Token exchange successful:', {
        access_token: tokens.access_token ? tokens.access_token.substring(0, 20) + '...' : 'None',
        refresh_token: tokens.refresh_token ? 'Present' : 'None',
        expires_in: tokens.expires_in
      });

      // Test calendar fetch
      if (tokens.access_token) {
        console.log('📅 Testing calendar fetch...');
        const calendars = await this.fetchCalendars(tokens.access_token);
        console.log(`✅ Calendar fetch successful: ${calendars.items?.length || 0} calendars found`);
        
        if (calendars.items && calendars.items.length > 0) {
          console.log('📋 Sample calendars:');
          calendars.items.slice(0, 3).forEach(cal => {
            console.log(`  - ${cal.summary} (${cal.id})`);
          });
        }
      }

    } catch (tokenError) {
      console.error('❌ Token exchange failed:', tokenError.message);
    }
  }

  async exchangeCodeForTokens(code) {
    const fetch = require('node-fetch');
    
    const tokenData = {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI
    };

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenData)
    });

    const tokens = await response.json();
    
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${tokens.error_description || tokens.error}`);
    }

    return tokens;
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

  generateAuthUrl() {
    const state = crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
      state: state
    });

    return {
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      state
    };
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('✅ OAuth server stopped');
    }
  }
}

// Run the test
async function runTest() {
  const server = new TestOAuthServer();
  
  try {
    await server.start();
    
    const { authUrl, state } = server.generateAuthUrl();
    
    console.log('\n🚀 OAuth Test Ready!');
    console.log('==================');
    console.log('\n📋 Manual Test Instructions:');
    console.log('1. Copy and paste this URL into your browser:');
    console.log(`\n${authUrl}\n`);
    console.log('2. Complete the Google OAuth flow');
    console.log('3. Watch the console for results');
    console.log(`4. The callback should redirect to: http://127.0.0.1:${server.port}/oauth2callback`);
    console.log('\n⏰ Server will run for 5 minutes for testing...');
    
    // Keep server running for testing
    setTimeout(() => {
      console.log('\n⏰ Test timeout reached');
      server.stop();
      process.exit(0);
    }, 300000); // 5 minutes
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    server.stop();
    process.exit(1);
  }
}

runTest().catch(console.error);