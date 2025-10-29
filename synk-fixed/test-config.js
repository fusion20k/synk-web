#!/usr/bin/env node

// Test configuration loading
console.log('=== Synk Configuration Test ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MODE:', process.env.MODE);

try {
  const config = require('./src/config');
  
  console.log('\n✓ Configuration loaded successfully!');
  console.log('Mode:', config.get('MODE'));
  console.log('Demo Mode:', config.get('DEMO_MODE'));
  console.log('Development:', config.isDevelopment());
  console.log('Production:', config.isProduction());
  console.log('Demo Mode Active:', config.isDemoMode());
  
  console.log('\n--- Google Config ---');
  const googleConfig = config.getGoogleConfig();
  console.log('Client ID:', googleConfig.clientId ? `${googleConfig.clientId.substring(0, 20)}...` : 'MISSING');
  console.log('Client Secret:', googleConfig.clientSecret ? `${googleConfig.clientSecret.substring(0, 10)}...` : 'MISSING');
  console.log('Redirect URI:', googleConfig.redirectUri);
  
  console.log('\n--- Notion Config ---');
  const notionConfig = config.getNotionConfig();
  console.log('Client ID:', notionConfig.clientId ? `${notionConfig.clientId.substring(0, 20)}...` : 'MISSING');
  console.log('Client Secret:', notionConfig.clientSecret ? `${notionConfig.clientSecret.substring(0, 10)}...` : 'MISSING');
  console.log('Redirect URI:', notionConfig.redirectUri);
  
  console.log('\n✅ All configuration checks passed!');
  
} catch (error) {
  console.error('\n❌ Configuration error:', error.message);
  process.exit(1);
}