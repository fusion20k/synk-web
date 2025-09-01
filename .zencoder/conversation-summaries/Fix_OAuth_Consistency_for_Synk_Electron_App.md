---
timestamp: 2025-08-26T02:06:26.442488
initial_query: Continue. You were in the middle of request:
Fix OAuth consistency — instructions for Zencoder (paste this)
Summary of the current errors
Notion: Missing or incomplete Client ID → env var not read or wrong env key / integration still Internal or redirect URI mismatch.
Google: 404 in popup → redirect URI used by the app does not exactly match the URI registered in Google Cloud Console.
High-level requirement
Production must use official redirect URIs on https://synk-official.com.
Demo/dev must use localhost redirect URIs.
The app must choose redirect URIs by environment flag (NODE_ENV or MODE).
The OAuth popup must always show account selection and consent (Google must show consent screen). Use prompt=select_account consent and access_type=offline and PKCE for Google.
1) .env / config template (exact keys)
Create two files .env.development and .env.production. Use these keys exactly.
```
# .env.development (demo/local)
MODE=development
DEMO_MODE=true
NOTION_CLIENT_ID=xxxxx
NOTION_CLIENT_SECRET=xxxxx
NOTION_REDIRECT_URI=http://localhost:3000/oauth/notion/callback
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback

# .env.production (official)
MODE=production
DEMO_MODE=false
NOTION_CLIENT_ID=xxxxx
NOTION_CLIENT_SECRET=xxxxx
NOTION_REDIRECT_URI=https://synk-official.com/oauth/notion/callback
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REDIRECT_URI=https://synk-official.com/oauth/google/callback

```
Zencoder must ensure the app reads the correct file by NODE_ENV or MODE at startup and fails fast with a clear log if required keys are missing.
2) Register redirect URIs (developer consoles)
Notion Developer Portal (integration → distribution / OAuth settings): add both URIs:
http://localhost:3000/oauth/notion/callback
https://synk-official.com/oauth/notion/callback
Make the integration Public so OAuth Client ID + Secret are available.
Google Cloud Console → Credentials → OAuth Client: add both URIs to Authorized redirect URIs:
http://localhost:3000/oauth/google/callback
https://synk-official.com/oauth/google/callback
(Exact match required — trailing slashes matter.)
3) Build auth URLs (exact templates)
Google (PKCE + forced consent & account select) Zencoder should generate PKCE (code_verifier, code_challenge) and state then:
```
const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth' +
  `?client_id=${GOOGLE_CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent('openid email profile https://www.googleapis.com/auth/calendar.readonly')}` +
  `&access_type=offline` +
  `&prompt=consent%20select_account` +           // force account selection + consent
  `&state=${state}` +
  `&code_challenge=${code_challenge}` +
  `&code_challenge_method=S256`;

```
Notion (standard auth code flow; include state):
```
const notionAuthUrl =
  'https://www.notion.com/oauth2/v2/auth' +
  `?client_id=${NOTION_CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(NOTION_REDIRECT_URI)}` +
  `&response_type=code` +
  `&owner=user` +
  `&state=${state}`;

```
Note: if Notion supports prompt=consent, include it; otherwise rely on owner=user and the Notion OAuth UI.
4) How to open popup / handle callback
Behavior requirement
Always open the system browser window for OAuth (desktop): shell.openExternal(authUrl) (not a hidden webview).
Start the loopback server only for dev (localhost callback) OR expect your public server to handle the production callback at https://synk-official.com/... (production packaged app must call the production endpoint).
After redirect lands at the configured callback, exchange code for tokens.
Minimal server callback skeleton (Express)
```
// POST / GET callback handler (server side)
app.get('/oauth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  // validate state
  // Exchange:
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: storedCodeVerifier // from PKCE flow
    })
  });
  const tokens = await tokenRes.json();
  // save tokens securely (keytar)
  res.send('<html><body>Success — return to Synk app.</body></html>');
});

```
Notion token exchange is similar to https://api.notion.com/v1/oauth/token with grant_type=authorization_code, code, redirect_uri, client_id, client_secret.
5) Force account selection & consent
For Google: prompt=consent select_account is mandatory (ensures the account select UI and consent screen appear every time).
For Notion: ensure integration is public and that Notion’s OAuth UI shows workspace selection; if user is auto-selected, confirm Notion console settings or use hosted relay approach (relay page that forwards to app) and don’t autofill code.
6) App-side checks & logging (must implement)
On startup, validate required env keys and log a single-line descriptive error if any missing:
MISSING: NOTION_CLIENT_ID etc.
Log the authUrl (for debugging) but never log secrets or tokens.
Show a clear UI error toast: OAuth misconfigured: check redirect URIs and client IDs.
7) Demo mode behavior (explicit)
DEMO_MODE = true:
The popup must still appear (open system browser) for UX parity.
After popup returns/succeeds/fails or after timeout (45s), show sample data in the app but mark it Demo data.
DEMO_MODE = false:
Perform real token exchange and fetch live data.
8) Quick tests for Zencoder to run locally
Set .env.development and run dev server.
Click “Connect Notion” → browser opens → user selects workspace → callback hits http://localhost:3000/oauth/notion/callback → server exchanges code → tokens saved.
Click “Connect Google” → browser opens with account selector + consent → callback hits http://localhost:3000/oauth/google/callback → exchange tokens → fetch calendar list.
Toggle DEMO_MODE true → still open popup → after callback or timeout show sample data.
Avoid repeating steps you've already taken.
task_state: working
total_messages: 94
---

# Conversation Summary

## Initial Query
Continue. You were in the middle of request:
Fix OAuth consistency — instructions for Zencoder (paste this)
Summary of the current errors
Notion: Missing or incomplete Client ID → env var not read or wrong env key / integration still Internal or redirect URI mismatch.
Google: 404 in popup → redirect URI used by the app does not exactly match the URI registered in Google Cloud Console.
High-level requirement
Production must use official redirect URIs on https://synk-official.com.
Demo/dev must use localhost redirect URIs.
The app must choose redirect URIs by environment flag (NODE_ENV or MODE).
The OAuth popup must always show account selection and consent (Google must show consent screen). Use prompt=select_account consent and access_type=offline and PKCE for Google.
1) .env / config template (exact keys)
Create two files .env.development and .env.production. Use these keys exactly.
```
# .env.development (demo/local)
MODE=development
DEMO_MODE=true
NOTION_CLIENT_ID=xxxxx
NOTION_CLIENT_SECRET=xxxxx
NOTION_REDIRECT_URI=http://localhost:3000/oauth/notion/callback
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback

# .env.production (official)
MODE=production
DEMO_MODE=false
NOTION_CLIENT_ID=xxxxx
NOTION_CLIENT_SECRET=xxxxx
NOTION_REDIRECT_URI=https://synk-official.com/oauth/notion/callback
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REDIRECT_URI=https://synk-official.com/oauth/google/callback

```
Zencoder must ensure the app reads the correct file by NODE_ENV or MODE at startup and fails fast with a clear log if required keys are missing.
2) Register redirect URIs (developer consoles)
Notion Developer Portal (integration → distribution / OAuth settings): add both URIs:
http://localhost:3000/oauth/notion/callback
https://synk-official.com/oauth/notion/callback
Make the integration Public so OAuth Client ID + Secret are available.
Google Cloud Console → Credentials → OAuth Client: add both URIs to Authorized redirect URIs:
http://localhost:3000/oauth/google/callback
https://synk-official.com/oauth/google/callback
(Exact match required — trailing slashes matter.)
3) Build auth URLs (exact templates)
Google (PKCE + forced consent & account select) Zencoder should generate PKCE (code_verifier, code_challenge) and state then:
```
const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth' +
  `?client_id=${GOOGLE_CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent('openid email profile https://www.googleapis.com/auth/calendar.readonly')}` +
  `&access_type=offline` +
  `&prompt=consent%20select_account` +           // force account selection + consent
  `&state=${state}` +
  `&code_challenge=${code_challenge}` +
  `&code_challenge_method=S256`;

```
Notion (standard auth code flow; include state):
```
const notionAuthUrl =
  'https://www.notion.com/oauth2/v2/auth' +
  `?client_id=${NOTION_CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(NOTION_REDIRECT_URI)}` +
  `&response_type=code` +
  `&owner=user` +
  `&state=${state}`;

```
Note: if Notion supports prompt=consent, include it; otherwise rely on owner=user and the Notion OAuth UI.
4) How to open popup / handle callback
Behavior requirement
Always open the system browser window for OAuth (desktop): shell.openExternal(authUrl) (not a hidden webview).
Start the loopback server only for dev (localhost callback) OR expect your public server to handle the production callback at https://synk-official.com/... (production packaged app must call the production endpoint).
After redirect lands at the configured callback, exchange code for tokens.
Minimal server callback skeleton (Express)
```
// POST / GET callback handler (server side)
app.get('/oauth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  // validate state
  // Exchange:
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: storedCodeVerifier // from PKCE flow
    })
  });
  const tokens = await tokenRes.json();
  // save tokens securely (keytar)
  res.send('<html><body>Success — return to Synk app.</body></html>');
});

```
Notion token exchange is similar to https://api.notion.com/v1/oauth/token with grant_type=authorization_code, code, redirect_uri, client_id, client_secret.
5) Force account selection & consent
For Google: prompt=consent select_account is mandatory (ensures the account select UI and consent screen appear every time).
For Notion: ensure integration is public and that Notion’s OAuth UI shows workspace selection; if user is auto-selected, confirm Notion console settings or use hosted relay approach (relay page that forwards to app) and don’t autofill code.
6) App-side checks & logging (must implement)
On startup, validate required env keys and log a single-line descriptive error if any missing:
MISSING: NOTION_CLIENT_ID etc.
Log the authUrl (for debugging) but never log secrets or tokens.
Show a clear UI error toast: OAuth misconfigured: check redirect URIs and client IDs.
7) Demo mode behavior (explicit)
DEMO_MODE = true:
The popup must still appear (open system browser) for UX parity.
After popup returns/succeeds/fails or after timeout (45s), show sample data in the app but mark it Demo data.
DEMO_MODE = false:
Perform real token exchange and fetch live data.
8) Quick tests for Zencoder to run locally
Set .env.development and run dev server.
Click “Connect Notion” → browser opens → user selects workspace → callback hits http://localhost:3000/oauth/notion/callback → server exchanges code → tokens saved.
Click “Connect Google” → browser opens with account selector + consent → callback hits http://localhost:3000/oauth/google/callback → exchange tokens → fetch calendar list.
Toggle DEMO_MODE true → still open popup → after callback or timeout show sample data.
Avoid repeating steps you've already taken.

## Task State
working

## Complete Conversation Summary
This conversation focused on implementing a comprehensive OAuth solution for the Synk desktop application, which synchronizes Notion databases with Google Calendar. The user requested fixing OAuth consistency issues where Notion was missing Client ID configuration and Google was returning 404 errors in OAuth popups due to redirect URI mismatches.

The main requirements were to create a dual-environment OAuth system where production uses official redirect URIs on https://synk-official.com and development/demo uses localhost redirect URIs. The OAuth flows needed to force account selection and consent screens, with Google requiring PKCE implementation and specific prompt parameters.

I implemented a complete Electron-based OAuth solution with the following key components:

**Configuration System**: Created environment-specific configuration files (.env.development and .env.production) with proper validation and error handling. The config system automatically loads the correct environment file based on NODE_ENV and validates all required OAuth credentials at startup.

**OAuth URL Generation**: Built proper OAuth URL builders for both Google and Notion with exact specifications - Google using PKCE with S256 challenge method, forced consent and account selection prompts, and Notion using standard authorization code flow with workspace selection.

**OAuth Server**: Implemented an Express-based callback server that handles OAuth redirects, validates state parameters, exchanges authorization codes for tokens, and manages the complete OAuth flow for both services.

**OAuth Manager**: Created a centralized OAuth manager that coordinates the entire flow - opens system browser windows, manages callback waiting, handles demo mode behavior, and provides proper error handling and logging.

**Electron Integration**: Built a complete Electron application with IPC communication between main and renderer processes, proper window management, and integration with the OAuth system.

**Demo Mode Implementation**: Implemented explicit demo mode behavior where OAuth popups still appear for UX consistency but return sample data after timeout or completion, clearly marked as demo data in the UI.

**User Interface**: Created a modern dark-themed interface with connection status indicators, real-time logging, settings management, and proper visual feedback for OAuth operations.

**Documentation**: Provided comprehensive setup instructions for both Google Cloud Console and Notion Developer Portal, including exact redirect URI requirements and integration configuration steps.

**Technical Issues Encountered**: During implementation, we encountered Electron import issues where the app object was undefined. This was traced to Electron installation problems and version compatibility issues. The conversation ended while troubleshooting this by reinstalling Electron with a stable version (25.9.0).

**Current Status**: The OAuth implementation is complete and tested via configuration validation scripts. All OAuth URLs generate correctly with proper parameters. The main remaining issue is resolving the Electron runtime problem to enable full application testing. Once Electron is properly installed, the application should be ready for OAuth flow testing in both development and production modes.

**Key Technical Decisions**: Used PKCE for Google OAuth security, implemented proper state validation, chose system browser over embedded webview for OAuth (desktop app best practice), created environment-specific redirect URI handling, and implemented comprehensive error logging and validation.

## Important Files to View

- **c:\Users\david\Desktop\synk\synk-app\config.js** (lines 1-50)
- **c:\Users\david\Desktop\synk\synk-app\oauth-urls.js** (lines 1-48)
- **c:\Users\david\Desktop\synk\synk-app\oauth-server.js** (lines 1-80)
- **c:\Users\david\Desktop\synk\synk-app\oauth-manager.js** (lines 1-100)
- **c:\Users\david\Desktop\synk\synk-app\main.js** (lines 1-50)
- **c:\Users\david\Desktop\synk\synk-app\.env** (lines 1-18)
- **c:\Users\david\Desktop\synk\synk-app\OAUTH_SETUP.md** (lines 1-50)

