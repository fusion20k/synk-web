# Synk OAuth Setup Guide

This guide walks you through setting up OAuth for both development and production environments.

## Quick Start

1. **Validate Configuration**: `npm run validate`
2. **Run Development**: `npm run dev`
3. **Run Production**: `npm run prod`

## Environment Configuration

Synk automatically loads the correct environment file based on `NODE_ENV`:

- **Development**: `.env.development` (localhost URLs)
- **Production**: `.env.production` (synk-official.com URLs)

### Current Configuration Status

✅ **Development Environment** (`.env.development`):
- Mode: `development`
- Demo Mode: `true`
- Google Redirect: `http://localhost:3000/oauth/google/callback`
- Notion Redirect: `http://localhost:3000/oauth/notion/callback`

✅ **Production Environment** (`.env.production`):
- Mode: `production`
- Demo Mode: `false`
- Google Redirect: `https://synk-official.com/oauth/google/callback`
- Notion Redirect: `https://synk-official.com/oauth/notion/callback`

## OAuth Provider Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project or create a new one
3. Click "Create Credentials" → "OAuth 2.0 Client IDs"
4. Choose "Desktop application" as the application type
5. Add **both** redirect URIs to "Authorized redirect URIs":
   ```
   http://localhost:3000/oauth/google/callback
   https://synk-official.com/oauth/google/callback
   ```
6. Save and copy the Client ID and Client Secret

**Important**: 
- URLs must match exactly (no trailing slashes)
- Both development and production URLs must be registered
- Enable Google Calendar API in the APIs & Services section

### 2. Notion Developer Portal Setup

1. Go to [Notion My Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Fill in the basic information
4. **Set Integration Type to "Public"** (not Internal)
5. In OAuth settings, add **both** redirect URIs:
   ```
   http://localhost:3000/oauth/notion/callback
   https://synk-official.com/oauth/notion/callback
   ```
6. Save and copy the Client ID and Client Secret

**Important**:
- Integration MUST be set to "Public" for OAuth to work
- Both development and production URLs must be registered
- Grant appropriate permissions (read content, read user info)

## OAuth Flow Features

### Google OAuth
- ✅ PKCE enabled for security
- ✅ Offline access for refresh tokens
- ✅ Force consent screen (`prompt=consent select_account`)
- ✅ Account selection required
- ✅ Proper scopes: `openid email profile calendar.readonly`

### Notion OAuth
- ✅ Correct v2 endpoint (`www.notion.com/oauth2/v2/auth`)
- ✅ State parameter for CSRF protection
- ✅ User ownership (`owner=user`)

## Demo Mode Behavior

### Development Mode (`DEMO_MODE=true`)
- OAuth popup **always opens** for UX consistency
- After OAuth completion (success or failure), shows sample data
- Labeled as "Demo" in the UI
- No real API calls to Google/Notion services

### Production Mode (`DEMO_MODE=false`)
- Real OAuth flow with actual token exchange
- Live API calls to Google Calendar and Notion
- Tokens stored securely using keytar

## Testing & Validation

### Validate Configuration
```bash
# Test development config
npm run validate

# Test production config
npm run validate-prod
```

### Run the Application
```bash
# Development mode (with DevTools)
npm run dev

# Production mode
npm run prod
```

### Manual Testing Checklist

#### Development Testing
1. Run `npm run validate` - should pass all checks
2. Run `npm run dev`
3. Click "Connect Google" - browser should open with account selection
4. Complete OAuth - should redirect to localhost:3000 callback
5. Should show demo data with "Demo" label
6. Click "Connect Notion" - browser should open
7. Complete OAuth - should redirect to localhost:3000 callback
8. Should show demo databases with "Demo" label

#### Production Testing
1. Deploy to production server
2. Run `npm run validate-prod` - should pass all checks
3. Access https://synk-official.com
4. Test OAuth flows - should redirect to synk-official.com callbacks
5. Should show real data (no "Demo" labels)

## Troubleshooting

### Common Issues

#### "Missing or incomplete Client ID"
- Check that credentials are properly set in environment files
- Ensure no placeholder values (`xxxxx`)
- Run `npm run validate` to check configuration

#### "404 in popup" (Google)
- Verify redirect URI is registered in Google Cloud Console
- Check for exact URL match (no trailing slashes)
- Ensure both localhost and production URLs are registered

#### "Invalid redirect URI" (Notion)
- Verify redirect URI is registered in Notion integration settings
- Ensure integration is set to "Public" not "Internal"
- Check for exact URL match

#### "OAuth misconfigured" error
- Run `npm run validate` to identify specific issues
- Check that all required environment variables are set
- Verify OAuth provider console settings

### Debug Logging

The application logs detailed OAuth information:
- Configuration loading status
- OAuth URL generation
- Callback server status
- Token exchange results

Check the console output for specific error messages.

## Security Notes

- Client secrets are loaded from environment files (not hardcoded)
- PKCE is used for Google OAuth (prevents code interception)
- State parameters prevent CSRF attacks
- Tokens are stored securely using keytar
- Demo mode prevents accidental API calls during development

## Environment Variables Reference

### Required Variables (both environments)
```bash
MODE=development|production
DEMO_MODE=true|false
NOTION_CLIENT_ID=your-notion-client-id
NOTION_CLIENT_SECRET=your-notion-client-secret
NOTION_REDIRECT_URI=http://localhost:3000/oauth/notion/callback
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback
```

### Current Credentials
The environment files are already configured with working credentials for both development and production environments.

## Next Steps

1. **Register Redirect URIs**: Add the URLs to Google Cloud Console and Notion Developer Portal
2. **Set Notion to Public**: Ensure your Notion integration is public, not internal
3. **Test Development**: Run `npm run dev` and test both OAuth flows
4. **Deploy Production**: Deploy to synk-official.com and test production OAuth
5. **Monitor Logs**: Check console output for any OAuth errors

For additional help, run `npm run validate` to get specific configuration feedback.