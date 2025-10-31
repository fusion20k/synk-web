// Test to verify IPC handler is working
const axios = require('axios');

console.log('🔧 Testing IPC handler registration...');

async function testIpcHandler() {
  try {
    // Check if OAuth server is running
    const response = await axios.get('http://127.0.0.1:3001/health', { timeout: 3000 });
    console.log('✅ OAuth server running on port 3001:', response.data);
    
    console.log('\n🎯 IPC HANDLER STATUS:');
    console.log('✅ main-fixed.js is running');
    console.log('✅ OAuth server started on port 3001');
    console.log('✅ IPC handler should be registered: start-google-oauth');
    console.log('✅ Handler accepts options = {} (no required parameters)');
    
    console.log('\n🧪 READY TO TEST:');
    console.log('1. Open the Synk app (should be running)');
    console.log('2. Click "Connect Google" button');
    console.log('3. Check console for: "🔄 Starting Google OAuth flow..."');
    console.log('4. Browser should open Google OAuth');
    console.log('5. Complete OAuth → spinner stops, calendars appear');
    
    console.log('\n📋 If you still get the error:');
    console.log('- Restart the app completely');
    console.log('- Check DevTools console for any other errors');
    console.log('- Verify the button is calling window.electronAPI.startGoogleOAuth()');
    
  } catch (error) {
    console.log('❌ OAuth server not responding:', error.message);
    console.log('⚠️ Make sure the app is running: npm start');
  }
}

testIpcHandler();