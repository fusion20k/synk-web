// Test the complete OAuth flow
const { googleOAuth, startOAuthServer, app } = require('./src/oauth');

// Mock shell object
const mockShell = {
  openExternal: (url) => {
    console.log('Would open URL:', url);
    return Promise.resolve();
  }
};

async function testOAuthFlow() {
  console.log('Testing OAuth flow...');
  
  try {
    // Start the OAuth server
    await startOAuthServer(3000);
    console.log('OAuth server started');
    
    // Test the OAuth flow
    const result = await googleOAuth(mockShell);
    console.log('OAuth flow result:', result);
    
    console.log('\nOAuth flow test completed successfully!');
    console.log('The server is running on http://localhost:3000');
    console.log('You can test the callback at: http://localhost:3000/oauth2callback');
    console.log('\nTo test with real OAuth:');
    console.log('1. Copy the URL that would be opened');
    console.log('2. Open it in your browser');
    console.log('3. Complete the OAuth flow');
    console.log('4. Check the server logs for the callback');
    
  } catch (error) {
    console.error('OAuth flow test failed:', error);
  }
}

testOAuthFlow();