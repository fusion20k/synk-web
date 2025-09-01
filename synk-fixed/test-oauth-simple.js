// Simple test to verify OAuth server is working
require('dotenv').config();

async function testOAuthServer() {
  console.log('🧪 Testing OAuth Server Connection');
  console.log('==================================');
  
  try {
    // Test if we can start the OAuth server
    const { startOAuthServer } = require('./src/oauth-standalone');
    const port = await startOAuthServer();
    
    console.log(`✅ OAuth server started on port ${port}`);
    
    // Test health endpoint
    const fetch = require('node-fetch');
    
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      const data = await response.json();
      console.log('✅ Health check passed:', data);
    } catch (fetchError) {
      console.log('⚠️ Health check failed:', fetchError.message);
    }
    
    // Generate test OAuth URL
    const crypto = require('crypto');
    const state = crypto.randomBytes(16).toString('hex');
    
    const GOOGLE_CLIENT_ID = process.env.DEMO_MODE === 'true' ? 
      process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_REDIRECT_URI = process.env.DEMO_MODE === 'true' ? 
      process.env.GOOGLE_REDIRECT_URI_DEMO : process.env.GOOGLE_REDIRECT_URI;
    
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
      state: state
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    
    console.log('\n🔗 Test OAuth URL (copy and paste into browser):');
    console.log(authUrl);
    console.log('\n📋 Instructions:');
    console.log('1. Copy the URL above');
    console.log('2. Paste it into your browser');
    console.log('3. Complete the Google OAuth flow');
    console.log('4. Watch this console for the callback results');
    console.log('\n⏰ Server will run for 5 minutes...');
    
    // Keep server running for testing
    setTimeout(() => {
      console.log('\n⏰ Test timeout reached');
      process.exit(0);
    }, 300000); // 5 minutes
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testOAuthServer();