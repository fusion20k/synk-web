# Google Calendar API Test Instructions

## Step 1: Get Access Token Manually

Run this command to get the authorization URL:

```bash
curl -d "client_id=544344031124-1m1d09ighljp5i94g3l1fns74ss3vadg.apps.googleusercontent.com" \
     -d "scope=https://www.googleapis.com/auth/calendar.readonly" \
     -d "response_type=token" \
     -d "redirect_uri=https://synk-official.com/oauth2callback" \
     "https://accounts.google.com/o/oauth2/v2/auth"
```

This will output an auth URL. Open it in a browser, sign in, and copy the access_token from the redirect URL.

## Step 2: Test Calendar API

Replace `ACCESS_TOKEN_HERE` with the token you got from step 1:

```bash
curl -H "Authorization: Bearer ACCESS_TOKEN_HERE" \
     "https://www.googleapis.com/calendar/v3/users/me/calendarList"
```

Expected output should be a JSON list of calendars.

## Step 3: Run the App

After confirming the API works:

```bash
npm run dev
```

Click "Connect Google" and the OAuth flow should complete successfully.