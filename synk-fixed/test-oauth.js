// Test script to verify OAuth implementation
const { startOAuthServer, app } = require('./src/oauth');

console.log('Starting OAuth test server...');

startOAuthServer(3000).then(() => {
  console.log('OAuth server started on port 3000');
  console.log('You can test the callback at: http://localhost:3000/oauth2callback');
  console.log('Press Ctrl+C to stop');
}).catch(err => {
  console.error('Failed to start OAuth server:', err);
});