# OAuth Setup Instructions

## Required Developer Console Configuration

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID or create a new one
4. Add these **Authorized redirect URIs** (exact match required):
   ```
   http://localhost:3000/oauth/google/callback
   https://synk-official.com/oauth/google/callback
   ```
5. Save the configuration

**Important Notes:**
- Trailing slashes matter - use exact URIs above
- Both development and production URIs must be registered
- Client ID format: `xxxxx.apps.googleusercontent.com`

### 2. Notion Developer Portal Setup

1. Go to [Notion Developers](https://developers.notion.com/)
2. Navigate to your integration settings
3. Go to **Distribution** → **OAuth Settings**
4. Add these **Redirect URIs**:
   ```
   http://localhost:3000/oauth/notion/callback
   https://synk-official.com/oauth/notion/callback
   ```
5. **CRITICAL**: Set integration to **Public** (not Internal)
6. Save the configuration

**Important Notes:**
- Integration must be Public for OAuth to work
- Both development and production URIs must be registered
- Client ID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

## Environment Configuration

The app automatically loads the correct environment file:

### Development (.env.development)
```
MODE=development
DEMO_MODE=true
NOTION_CLIENT_ID=255d872b-594c-80b0-8966-00371dacee34
NOTION_CLIENT_SECRET=secret_4DeSCmfIJINGr0F96k9SvlAuJOwTcD65tQwaVeDbb46
NOTION_REDIRECT_URI=http://localhost:3000/oauth/notion/callback
GOOGLE_CLIENT_ID=544344031124-1m1d09ighljp5i94g3l1fns74ss3vadg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback
```

### Production (.env.production)
```
MODE=production
DEMO_MODE=false
NOTION_CLIENT_ID=255d872b-594c-80b0-8966-00371dacee34
NOTION_CLIENT_SECRET=secret_4DeSCmfIJINGr0F96k9SvlAuJOwTcD65tQwaVeDbb46
NOTION_REDIRECT_URI=https://synk-official.com/oauth/notion/callback
GOOGLE_CLIENT_ID=544344031124-1m1d09ighljp5i94g3l1fns74ss3vadg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://synk-official.com/oauth/google/callback
```

## Testing OAuth Flows

### Quick Test Commands

1. **Test Configuration**:
   ```bash
   npm run test-oauth
   ```

2. **Run Development Mode**:
   ```bash
   npm run dev
   ```

3. **Run Production Mode**:
   ```bash
   npm run prod
   ```

### Expected OAuth Behavior

#### Google OAuth Flow:
1. Click "Connect Google" → System browser opens
2. **Account Selection Screen** appears (forced by `prompt=select_account`)
3. **Consent Screen** appears showing 4 scopes:
   - OpenID Connect authentication
   - Email address access
   - Basic profile information
   - Read-only calendar access
4. User approves → Redirect to callback → Tokens exchanged
5. Calendar list loaded in app

#### Notion OAuth Flow:
1. Click "Connect Notion" → System browser opens
2. **Workspace Selection Screen** appears (forced by `owner=user`)
3. **Permission Approval Screen** appears
4. User approves → Redirect to callback → Tokens exchanged
5. Database list loaded in app

### Demo Mode Behavior

When `DEMO_MODE=true`:
- OAuth popups still appear (for UX demonstration)
- After 45 seconds or successful OAuth, demo data is shown
- All data is marked as "Demo" in the UI
- Safe for recording demo videos

## Troubleshooting

### Common Issues:

1. **"OAuth misconfigured" error on startup**:
   - Check that all required environment variables are set
   - Verify .env.development or .env.production files exist

2. **"404 error" in OAuth popup**:
   - Verify redirect URIs in Google Cloud Console match exactly
   - Check for trailing slashes or typos

3. **Notion "Invalid client" error**:
   - Ensure integration is set to Public (not Internal)
   - Verify client ID and redirect URI are correct

4. **No consent screen shown (Google)**:
   - Check that `prompt=consent select_account` is in OAuth URL
   - Verify PKCE parameters are included

### Debug Logs

The app logs OAuth URLs for debugging (without secrets):
```
🔗 Google OAuth URL generated: https://accounts.google.com/o/oauth2/v2/auth?client_id=...
🔗 Notion OAuth URL generated: https://api.notion.com/v1/oauth/authorize?client_id=...
```

Check console output for these logs to verify URL generation.