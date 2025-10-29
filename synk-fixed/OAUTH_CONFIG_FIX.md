# OAuth Configuration Fix

## Issue
The Google Calendar OAuth flow was failing because the redirect URIs in the `.env` file were pointing to the production URL (`https://synk-official.com/oauth2callback`) instead of the local development server (`http://127.0.0.1:3000/oauth2callback`).

## Fix Applied
1. Updated `.env` file to use correct localhost redirect URIs for demo mode:
   - `GOOGLE_REDIRECT_URI_DEMO=http://127.0.0.1:3000/oauth2callback`
   - `NOTION_REDIRECT_URI_DEMO=http://127.0.0.1:3000/oauth2callback`

2. Set `DEMO_MODE=true` to use demo credentials with localhost redirect URIs

## Configuration Required
For local development, ensure your `.env` file has:

```env
DEMO_MODE=true
GOOGLE_REDIRECT_URI_DEMO=http://127.0.0.1:3000/oauth2callback
NOTION_REDIRECT_URI_DEMO=http://127.0.0.1:3000/oauth2callback
```

## Google Cloud Console Setup
Make sure your Google OAuth app has the following redirect URI configured:
- `http://127.0.0.1:3000/oauth2callback` (for local development)
- `https://synk-official.com/oauth2callback` (for production)

## Notion Integration Setup
Make sure your Notion integration has the following redirect URI configured:
- `http://127.0.0.1:3000/oauth2callback` (for local development)
- `https://synk-official.com/oauth2callback` (for production)

## Testing
1. Run `npm run dev`
2. Click "Connect Google" button
3. OAuth flow should redirect to local server and complete successfully
4. Google calendars should load within 5 seconds