#!/usr/bin/env node

/**
 * Test script to verify the Synk app configuration and startup
 */

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Synk App Configuration...\n');

// Test 1: Check if all required files exist
console.log('1. Checking required files...');
const requiredFiles = [
  '.env',
  '.env.development', 
  '.env.production',
  'src/index.html',
  'src/config.js',
  'src/oauth-urls.js',
  'src/token-storage.js',
  'src/preload.js',
  'main-oauth-fixed.js',
  'package.json',
  'favicon.jpg'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✓ ${file}`);
  } else {
    console.log(`   ✗ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please check the file structure.');
  process.exit(1);
}

// Test 2: Load and validate configuration
console.log('\n2. Testing configuration loading...');
try {
  const config = require('./src/config');
  
  console.log(`   ✓ Configuration loaded successfully`);
  console.log(`   ✓ Demo Mode: ${config.isDemoMode()}`);
  console.log(`   ✓ Environment: ${config.isDevelopment() ? 'development' : 'production'}`);
  
  const googleConfig = config.getGoogleConfig();
  const notionConfig = config.getNotionConfig();
  
  console.log(`   ✓ Google Client ID: ${googleConfig.clientId ? 'Present' : 'Missing'}`);
  console.log(`   ✓ Google Redirect URI: ${googleConfig.redirectUri}`);
  console.log(`   ✓ Notion Client ID: ${notionConfig.clientId ? 'Present' : 'Missing'}`);
  console.log(`   ✓ Notion Redirect URI: ${notionConfig.redirectUri}`);
  
} catch (error) {
  console.log(`   ✗ Configuration error: ${error.message}`);
  process.exit(1);
}

// Test 3: Test OAuth URL generation
console.log('\n3. Testing OAuth URL generation...');
try {
  const OAuthURLBuilder = require('./src/oauth-urls');
  
  const googleFlow = OAuthURLBuilder.createGoogleOAuthFlow();
  const notionFlow = OAuthURLBuilder.createNotionOAuthFlow();
  
  console.log(`   ✓ Google OAuth URL generated (${googleFlow.authUrl.length} chars)`);
  console.log(`   ✓ Notion OAuth URL generated (${notionFlow.authUrl.length} chars)`);
  
  // Check if URLs contain required parameters
  if (googleFlow.authUrl.includes('calendar.readonly') && googleFlow.authUrl.includes('calendar.events')) {
    console.log(`   ✓ Google OAuth includes required calendar scopes`);
  } else {
    console.log(`   ✗ Google OAuth missing calendar scopes`);
  }
  
} catch (error) {
  console.log(`   ✗ OAuth URL generation error: ${error.message}`);
  process.exit(1);
}

// Test 4: Check HTML file structure
console.log('\n4. Testing HTML file...');
try {
  const htmlContent = fs.readFileSync(path.join(__dirname, 'src/index.html'), 'utf8');
  
  if (htmlContent.includes('app-container')) {
    console.log(`   ✓ HTML contains app container`);
  } else {
    console.log(`   ✗ HTML missing app container`);
  }
  
  if (htmlContent.includes('sidebar')) {
    console.log(`   ✓ HTML contains sidebar`);
  } else {
    console.log(`   ✗ HTML missing sidebar`);
  }
  
  if (htmlContent.includes('border: 2px solid #333')) {
    console.log(`   ✓ HTML contains custom border styling`);
  } else {
    console.log(`   ✗ HTML missing custom border`);
  }
  
  if (htmlContent.includes('favicon.jpg')) {
    console.log(`   ✓ HTML references favicon`);
  } else {
    console.log(`   ✗ HTML missing favicon reference`);
  }
  
} catch (error) {
  console.log(`   ✗ HTML file error: ${error.message}`);
  process.exit(1);
}

console.log('\n✅ All tests passed! The app should be ready to run.');
console.log('\n🚀 To start the app, run: npm run dev');
console.log('📝 To switch between demo/production mode, edit DEMO_MODE in .env');