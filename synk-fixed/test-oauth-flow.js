#!/usr/bin/env node

// Test OAuth flow without Electron
const OAuthCallbackServer = require('./src/oauth-callback-server');
const OAuthURLBuilder = require('./src/oauth-urls');
const config = require('./src/config');

console.log('🧪 OAuth Flow Test');
console.log('==================');

async function testOAuthFlow() {
  let server;
  
  try {
    // Start the callback server
    console.log('\n1. Starting OAuth callback server...');
    server = new OAuthCallbackServer();
    const port = await server.start();
    console.log(`✅ Server started on port ${port}`);
    
    // Test Google OAuth URL generation
    console.log('\n2. Testing Google OAuth URL generation...');
    const googleFlow = OAuthURLBuilder.createGoogleOAuthFlow();
    console.log(`✅ Google OAuth URL: ${googleFlow.authUrl.substring(0, 100)}...`);
    
    // Register the flow
    server.registerPendingFlow('google', googleFlow.pkceData.state, { pkceData: googleFlow.pkceData });
    console.log(`✅ Google flow registered with state: ${googleFlow.pkceData.state}`);
    
    // Test Notion OAuth URL generation
    console.log('\n3. Testing Notion OAuth URL generation...');
    const notionFlow = OAuthURLBuilder.createNotionOAuthFlow();
    console.log(`✅ Notion OAuth URL: ${notionFlow.authUrl.substring(0, 100)}...`);
    
    // Register the flow
    server.registerPendingFlow('notion', notionFlow.state, { state: notionFlow.state });
    console.log(`✅ Notion flow registered with state: ${notionFlow.state}`);
    
    // Test health endpoint
    console.log('\n4. Testing health endpoint...');
    const fetch = require('node-fetch');
    const healthResponse = await fetch(`http://localhost:${port}/health`);
    const healthData = await healthResponse.json();
    console.log(`✅ Health check: ${JSON.stringify(healthData, null, 2)}`);
    
    console.log('\n🎉 All OAuth flow tests passed!');
    console.log('\n📋 Manual Testing Instructions:');
    console.log(`1. Open: ${googleFlow.authUrl}`);
    console.log(`2. Complete Google OAuth flow`);
    console.log(`3. Should redirect to: http://localhost:${port}/oauth/google/callback`);
    console.log(`4. Open: ${notionFlow.authUrl}`);
    console.log(`5. Complete Notion OAuth flow`);
    console.log(`6. Should redirect to: http://localhost:${port}/oauth/notion/callback`);
    console.log(`\n⏰ Server will stay running for 30 seconds for manual testing...`);
    
    // Keep server running for manual testing
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ OAuth flow test failed:', error.message);
    process.exit(1);
  } finally {
    if (server) {
      server.stop();
      console.log('\n✅ Test server stopped');
    }
  }
}

// Run the test
testOAuthFlow().catch(console.error);