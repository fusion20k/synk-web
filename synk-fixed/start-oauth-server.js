// Start just the OAuth server for testing
require('dotenv').config();

const { startOAuthServer } = require('./src/oauth-server');

console.log('🚀 Starting OAuth server for testing...');
console.log(`🔧 DEMO_MODE: ${process.env.DEMO_MODE || 'false'}`);

startOAuthServer().then(({ server, port }) => {
  console.log(`✅ OAuth server running on port ${port}`);
  console.log(`🌐 Test URL: http://127.0.0.1:${port}/status`);
  console.log(`📋 Open test-complete-oauth.html in your browser to test the complete flow`);
  
  // Keep server running
  console.log('⏰ Server will run indefinitely. Press Ctrl+C to stop.');
}).catch(error => {
  console.error('❌ Failed to start OAuth server:', error);
  process.exit(1);
});