# 🔧 Server Implementation Guide for OAuth Polling Fix

## Problem
The Electron app polls `https://synk-official.com/api/oauth/result?state=XYZ` but gets 404 errors because the server routes aren't properly implemented.

## Required Server Implementation

### 1. OAuth Callback Route (`/oauth2callback`)

This route handles the redirect from Google OAuth:

```javascript
app.get('/oauth2callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`/oauth-error?error=${encodeURIComponent(error)}`);
    }
    
    if (!code || !state) {
      console.error('Missing code or state parameter');
      return res.redirect('/oauth-error?error=missing_parameters');
    }
    
    console.log('📥 OAuth callback received for state:', state);
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://synk-official.com/oauth2callback'
      })
    });
    
    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      console.error('Token exchange error:', tokens.error);
      return res.redirect(`/oauth-error?error=${encodeURIComponent(tokens.error)}`);
    }
    
    console.log('✅ Tokens received for state:', state);
    
    // Fetch user's calendars
    const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });
    
    const calendarsData = await calendarsResponse.json();
    const calendars = calendarsData.items || [];
    
    console.log(`📅 ${calendars.length} calendars fetched for state:`, state);
    
    // Store results temporarily (in memory or Redis)
    oauthResults[state] = {
      success: true,
      tokens: tokens,
      calendars: calendars,
      timestamp: Date.now()
    };
    
    // Redirect to success page
    res.redirect('/oauth-success');
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`/oauth-error?error=${encodeURIComponent(error.message)}`);
  }
});
```

### 2. OAuth Result Polling Route (`/api/oauth/result`)

This route is polled by the Electron app:

```javascript
app.get('/api/oauth/result', (req, res) => {
  const { state } = req.query;
  
  if (!state) {
    return res.status(400).json({ success: false, error: 'Missing state parameter' });
  }
  
  console.log('🔍 Polling request for state:', state);
  
  const result = oauthResults[state];
  
  if (!result) {
    // No result yet - this is normal, return 404 or pending status
    console.log('⏳ No result yet for state:', state);
    return res.status(404).json({ success: false, error: 'pending' });
  }
  
  console.log('✅ Returning result for state:', state);
  
  // Return the result
  res.json({
    success: true,
    tokens: result.tokens,
    calendars: result.calendars
  });
  
  // Clean up - remove from memory after returning
  delete oauthResults[state];
});
```

### 3. In-Memory Storage

Add this at the top of your server file:

```javascript
// Temporary storage for OAuth results
const oauthResults = {};

// Clean up old results every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  for (const [state, result] of Object.entries(oauthResults)) {
    if (now - result.timestamp > fiveMinutes) {
      console.log('🧹 Cleaning up expired OAuth result for state:', state);
      delete oauthResults[state];
    }
  }
}, 5 * 60 * 1000);
```

### 4. Success/Error Pages

Create simple HTML pages:

**`/oauth-success`**:
```html
<!DOCTYPE html>
<html>
<head>
    <title>OAuth Success</title>
</head>
<body>
    <h1>✅ Authentication Successful</h1>
    <p>You can now close this window and return to the Synk app.</p>
    <script>
        // Auto-close after 3 seconds
        setTimeout(() => window.close(), 3000);
    </script>
</body>
</html>
```

**`/oauth-error`**:
```html
<!DOCTYPE html>
<html>
<head>
    <title>OAuth Error</title>
</head>
<body>
    <h1>❌ Authentication Failed</h1>
    <p>Error: <span id="error"></span></p>
    <p>Please try again in the Synk app.</p>
    <script>
        const params = new URLSearchParams(window.location.search);
        document.getElementById('error').textContent = params.get('error') || 'Unknown error';
    </script>
</body>
</html>
```

## Environment Variables Required

Make sure these are set on the production server:

```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Testing the Fix

1. Deploy the server changes to `synk-official.com`
2. Start the Electron app: `npm start`
3. Click "Connect Google"
4. Complete OAuth in browser
5. Check console logs for polling success
6. Verify calendars load in the app

## Expected Flow

1. **User clicks "Connect Google"** → Browser opens Google OAuth
2. **User completes OAuth** → Google redirects to `/oauth2callback`
3. **Server exchanges code for tokens** → Stores in `oauthResults[state]`
4. **Server redirects to success page** → User sees success message
5. **Electron app polls `/api/oauth/result`** → Gets tokens and calendars
6. **App stores tokens locally** → Shows calendars to user

The 404 errors will stop once the `/api/oauth/result` route is properly implemented on the production server.