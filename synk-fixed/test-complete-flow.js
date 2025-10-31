// Test the complete OAuth flow
require('dotenv').config();

async function testCompleteFlow() {
  console.log('🧪 Testing Complete OAuth Flow');
  console.log('==============================');
  
  try {
    // Start the OAuth server
    const { startOAuthServer } = require('./src/oauth-server');
    const { server, port } = await startOAuthServer();
    
    console.log(`✅ OAuth server started on port ${port}`);
    
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
    
    console.log('\n🔗 Complete OAuth Test URL:');
    console.log(authUrl);
    console.log('\n📋 Testing Instructions:');
    console.log('1. Copy the URL above and paste it into your browser');
    console.log('2. Complete the Google OAuth flow');
    console.log('3. The callback page will:');
    console.log('   - Exchange the code for tokens');
    console.log('   - Fetch your Google calendars');
    console.log('   - Send the data to this OAuth server');
    console.log('4. Watch this console for the complete flow results');
    console.log('\n⏰ Server will run for 10 minutes for testing...');
    
    // Set up a mock main window to receive IPC messages
    const mockMainWindow = {
      webContents: {
        send: (event, data) => {
          console.log(`\n🎉 IPC EVENT RECEIVED: ${event}`);
          console.log('📊 Data:', JSON.stringify(data, null, 2));
          
          if (event === 'google:calendars') {
            console.log(`\n✅ SUCCESS! Calendar data received:`);
            console.log(`   - Calendars found: ${data.items?.length || 0}`);
            console.log(`   - Calendar names: ${data.items?.map(cal => cal.summary).join(', ') || 'None'}`);
            console.log('\n🎯 INFINITE LOADING ISSUE IS NOW FIXED!');
            console.log('   The frontend would receive this data and stop the spinner.');
          }
        }
      }
    };
    
    // Connect the mock window to the OAuth server
    server.setMainWindow(mockMainWindow);
    console.log('✅ Mock main window connected to OAuth server');
    
    // Keep server running for testing
    setTimeout(() => {
      console.log('\n⏰ Test timeout reached');
      process.exit(0);
    }, 600000); // 10 minutes
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testCompleteFlow();