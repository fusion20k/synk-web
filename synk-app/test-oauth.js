// OAuth configuration test script
const config = require('./config');
const OAuthURLBuilder = require('./oauth-urls');

console.log('🧪 Testing OAuth Configuration...\n');

try {
    // Test configuration loading
    console.log('📋 Configuration:');
    console.log(`  Mode: ${config.get('MODE')}`);
    console.log(`  Demo Mode: ${config.isDemoMode()}`);
    console.log(`  Development: ${config.isDevelopment()}`);
    console.log(`  Google Client ID: ${config.get('GOOGLE_CLIENT_ID')?.substring(0, 20)}...`);
    console.log(`  Notion Client ID: ${config.get('NOTION_CLIENT_ID')?.substring(0, 20)}...`);
    console.log(`  Google Redirect: ${config.get('GOOGLE_REDIRECT_URI')}`);
    console.log(`  Notion Redirect: ${config.get('NOTION_REDIRECT_URI')}\n`);

    // Test Google OAuth URL generation
    console.log('🔗 Google OAuth URL:');
    const googleAuth = OAuthURLBuilder.buildGoogleAuthURL();
    console.log(`  URL: ${googleAuth.authUrl.substring(0, 100)}...`);
    console.log(`  State: ${googleAuth.state}`);
    console.log(`  Code Verifier: ${googleAuth.codeVerifier.substring(0, 20)}...\n`);

    // Test Notion OAuth URL generation
    console.log('🔗 Notion OAuth URL:');
    const notionAuth = OAuthURLBuilder.buildNotionAuthURL();
    console.log(`  URL: ${notionAuth.authUrl.substring(0, 100)}...`);
    console.log(`  State: ${notionAuth.state}\n`);

    // Validate URL parameters
    console.log('✅ Validation:');
    
    // Check Google URL parameters
    const googleUrl = new URL(googleAuth.authUrl);
    const googleParams = googleUrl.searchParams;
    
    console.log('  Google OAuth Parameters:');
    console.log(`    ✓ client_id: ${googleParams.has('client_id') ? 'Present' : '❌ Missing'}`);
    console.log(`    ✓ redirect_uri: ${googleParams.has('redirect_uri') ? 'Present' : '❌ Missing'}`);
    console.log(`    ✓ response_type: ${googleParams.get('response_type') === 'code' ? 'code ✓' : '❌ Invalid'}`);
    console.log(`    ✓ scope: ${googleParams.has('scope') ? 'Present' : '❌ Missing'}`);
    console.log(`    ✓ access_type: ${googleParams.get('access_type') === 'offline' ? 'offline ✓' : '❌ Invalid'}`);
    console.log(`    ✓ prompt: ${googleParams.get('prompt')?.includes('consent') ? 'consent ✓' : '❌ Missing consent'}`);
    console.log(`    ✓ prompt: ${googleParams.get('prompt')?.includes('select_account') ? 'select_account ✓' : '❌ Missing select_account'}`);
    console.log(`    ✓ code_challenge: ${googleParams.has('code_challenge') ? 'Present ✓' : '❌ Missing'}`);
    console.log(`    ✓ code_challenge_method: ${googleParams.get('code_challenge_method') === 'S256' ? 'S256 ✓' : '❌ Invalid'}`);

    // Check Notion URL parameters
    const notionUrl = new URL(notionAuth.authUrl);
    const notionParams = notionUrl.searchParams;
    
    console.log('  Notion OAuth Parameters:');
    console.log(`    ✓ client_id: ${notionParams.has('client_id') ? 'Present' : '❌ Missing'}`);
    console.log(`    ✓ redirect_uri: ${notionParams.has('redirect_uri') ? 'Present' : '❌ Missing'}`);
    console.log(`    ✓ response_type: ${notionParams.get('response_type') === 'code' ? 'code ✓' : '❌ Invalid'}`);
    console.log(`    ✓ owner: ${notionParams.get('owner') === 'user' ? 'user ✓' : '❌ Invalid'}`);
    console.log(`    ✓ state: ${notionParams.has('state') ? 'Present ✓' : '❌ Missing'}`);

    console.log('\n🎉 OAuth configuration test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Register redirect URIs in Google Cloud Console and Notion Developer Portal');
    console.log('2. Make sure Notion integration is set to Public');
    console.log('3. Test OAuth flows by running: npm run dev');

} catch (error) {
    console.error('❌ OAuth configuration test failed:', error.message);
    process.exit(1);
}