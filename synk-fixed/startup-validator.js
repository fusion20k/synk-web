#!/usr/bin/env node

// Startup validation for Synk OAuth configuration
console.log('🚀 Synk OAuth Startup Validator');
console.log('================================');

let hasErrors = false;

function logError(message) {
  console.error(`❌ ${message}`);
  hasErrors = true;
}

function logWarning(message) {
  console.warn(`⚠️  ${message}`);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

// Check environment
const nodeEnv = process.env.NODE_ENV || 'development';
const mode = process.env.MODE || nodeEnv;

console.log(`\n📋 Environment Check`);
console.log(`NODE_ENV: ${nodeEnv}`);
console.log(`MODE: ${mode}`);

// Load and validate configuration
try {
  const config = require('./src/config');
  
  logSuccess('Configuration loaded successfully');
  
  // Environment validation
  if (config.isDevelopment()) {
    logSuccess('Running in DEVELOPMENT mode');
    if (config.isDemoMode()) {
      logSuccess('Demo mode is ENABLED');
    } else {
      logWarning('Demo mode is DISABLED in development');
    }
  } else if (config.isProduction()) {
    logSuccess('Running in PRODUCTION mode');
    if (config.isDemoMode()) {
      logWarning('Demo mode is ENABLED in production (should be false)');
    } else {
      logSuccess('Demo mode is DISABLED in production');
    }
  }
  
  // OAuth Configuration Validation
  console.log(`\n🔐 OAuth Configuration Check`);
  
  const googleConfig = config.getGoogleConfig();
  const notionConfig = config.getNotionConfig();
  
  // Google OAuth validation
  console.log(`\n--- Google OAuth ---`);
  if (googleConfig.clientId && googleConfig.clientId !== 'xxxxx') {
    logSuccess(`Google Client ID configured (${googleConfig.clientId.substring(0, 20)}...)`);
  } else {
    logError('Google Client ID is missing or placeholder');
  }
  
  if (googleConfig.clientSecret && googleConfig.clientSecret !== 'xxxxx') {
    logSuccess(`Google Client Secret configured (${googleConfig.clientSecret.substring(0, 10)}...)`);
  } else {
    logError('Google Client Secret is missing or placeholder');
  }
  
  if (googleConfig.redirectUri) {
    logSuccess(`Google Redirect URI: ${googleConfig.redirectUri}`);
    
    // Validate redirect URI format for production
    if (!googleConfig.redirectUri.includes('synk-official.com')) {
      logWarning('Should use synk-official.com redirect URI for production');
    }
    
    if (!googleConfig.redirectUri.includes('/oauth2callback')) {
      logError('Google redirect URI should end with /oauth2callback');
    }
  } else {
    logError('Google Redirect URI is missing');
  }
  
  // Notion OAuth validation
  console.log(`\n--- Notion OAuth ---`);
  if (notionConfig.clientId && notionConfig.clientId !== 'xxxxx') {
    logSuccess(`Notion Client ID configured (${notionConfig.clientId.substring(0, 20)}...)`);
  } else {
    logError('Notion Client ID is missing or placeholder');
  }
  
  if (notionConfig.clientSecret && notionConfig.clientSecret !== 'xxxxx') {
    logSuccess(`Notion Client Secret configured (${notionConfig.clientSecret.substring(0, 10)}...)`);
  } else {
    logError('Notion Client Secret is missing or placeholder');
  }
  
  if (notionConfig.redirectUri) {
    logSuccess(`Notion Redirect URI: ${notionConfig.redirectUri}`);
    
    // Validate redirect URI format for production
    if (!notionConfig.redirectUri.includes('synk-official.com')) {
      logWarning('Should use synk-official.com redirect URI for production');
    }
    
    if (!notionConfig.redirectUri.includes('/oauth2callback/notion')) {
      logError('Notion redirect URI should end with /oauth2callback/notion');
    }
  } else {
    logError('Notion Redirect URI is missing');
  }
  
  // OAuth URL Generation Test
  console.log(`\n🔗 OAuth URL Generation Test`);
  
  try {
    const OAuthURLBuilder = require('./src/oauth-urls');
    
    // Test Google OAuth URL
    const googleFlow = OAuthURLBuilder.createGoogleOAuthFlow();
    if (googleFlow.authUrl && googleFlow.authUrl.includes('accounts.google.com')) {
      logSuccess('Google OAuth URL generation works');
      
      // Check for required parameters
      if (googleFlow.authUrl.includes('prompt=consent%20select_account')) {
        logSuccess('Google OAuth includes consent + account selection');
      } else {
        logError('Google OAuth missing consent + account selection parameters');
      }
      
      if (googleFlow.authUrl.includes('code_challenge=') && googleFlow.authUrl.includes('code_challenge_method=S256')) {
        logSuccess('Google OAuth PKCE enabled');
      } else {
        logError('Google OAuth PKCE not properly configured');
      }
      
      if (googleFlow.authUrl.includes('access_type=offline')) {
        logSuccess('Google OAuth offline access enabled');
      } else {
        logError('Google OAuth missing offline access');
      }
    } else {
      logError('Google OAuth URL generation failed');
    }
    
    // Test Notion OAuth URL
    const notionFlow = OAuthURLBuilder.createNotionOAuthFlow();
    if (notionFlow.authUrl && notionFlow.authUrl.includes('www.notion.com/oauth2/v2/auth')) {
      logSuccess('Notion OAuth URL generation works');
      logSuccess('Notion OAuth using correct v2 endpoint');
    } else if (notionFlow.authUrl && notionFlow.authUrl.includes('api.notion.com')) {
      logError('Notion OAuth using wrong endpoint (should be www.notion.com/oauth2/v2/auth)');
    } else {
      logError('Notion OAuth URL generation failed');
    }
    
  } catch (error) {
    logError(`OAuth URL generation test failed: ${error.message}`);
  }
  
  // Final validation
  console.log(`\n📊 Validation Summary`);
  
  if (hasErrors) {
    console.log(`\n❌ VALIDATION FAILED - ${hasErrors ? 'Errors found' : 'No errors'}`);
    console.log(`\n🔧 Next Steps:`);
    console.log(`1. Fix the configuration errors listed above`);
    console.log(`2. Ensure redirect URIs are registered in OAuth provider consoles:`);
    console.log(`   - Google: https://console.cloud.google.com/apis/credentials`);
    console.log(`   - Notion: https://www.notion.so/my-integrations`);
    console.log(`3. Make sure Notion integration is set to "Public" not "Internal"`);
    console.log(`4. Run this validator again to confirm fixes`);
    process.exit(1);
  } else {
    logSuccess('ALL VALIDATIONS PASSED!');
    console.log(`\n🎉 Synk is ready to run in ${mode.toUpperCase()} mode`);
    console.log(`\n🚀 Start the app with:`);
    console.log(`   npm run dev    (development mode)`);
    console.log(`   npm run prod   (production mode)`);
  }
  
} catch (error) {
  logError(`Configuration loading failed: ${error.message}`);
  console.log(`\n🔧 Fix the configuration error and try again.`);
  process.exit(1);
}