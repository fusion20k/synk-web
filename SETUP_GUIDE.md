# 🚀 Synk Setup Guide

Your Synk server is now running! Follow these steps to complete the setup.

## ✅ Current Status
- ✅ Server is running on http://localhost:3000
- ✅ Basic endpoints are working
- ⚠️ Database and OAuth integrations need configuration

## 🔧 Required Setup Steps

### 1. Set up Supabase Database

1. **Create Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for it to initialize

2. **Create Database Table:**
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `database/schema.sql`
   - Run the SQL to create the users table

3. **Get Credentials:**
   - Go to Settings → API
   - Copy your Project URL and anon/public key

### 2. Set up Notion Integration

1. **Create Notion Integration:**
   - Go to [developers.notion.com](https://developers.notion.com)
   - Click "Create new integration"
   - Give it a name (e.g., "Synk")
   - Select your workspace

2. **Configure OAuth:**
   - In your integration settings, go to "OAuth Domain & URIs"
   - Add redirect URI: `http://localhost:3000/auth/notion/callback`
   - Copy your Client ID and Client Secret

### 3. Set up Google Calendar API

1. **Create Google Cloud Project:**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project or select existing

2. **Enable Calendar API:**
   - Go to APIs & Services → Library
   - Search for "Google Calendar API"
   - Click Enable

3. **Create OAuth Credentials:**
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: Web application
   - Add redirect URI: `http://localhost:3000/auth/google/callback`
   - Copy your Client ID and Client Secret

### 4. Update Environment Variables

Edit your `.env` file with the real values:

```env
# Server Configuration
PORT=3000

# Supabase Configuration
SUPABASE_URL=https://your-actual-project.supabase.co
SUPABASE_ANON_KEY=your-actual-supabase-anon-key

# Notion OAuth Configuration
NOTION_CLIENT_ID=your-actual-notion-client-id
NOTION_CLIENT_SECRET=your-actual-notion-client-secret
NOTION_REDIRECT_URI=http://localhost:3000/auth/notion/callback

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-actual-google-client-id
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Application URL
APP_URL=http://localhost:3000
```

### 5. Restart the Server

After updating your `.env` file:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
```

## 🧪 Testing the Integration

### Option 1: Web Interface
1. Open http://localhost:3000/test.html
2. Follow the step-by-step process

### Option 2: API Testing
1. Run the test script: `node test/api.test.js`
2. Use curl commands (see README.md)

## 📋 Integration Flow

1. **Connect Notion:**
   - Visit: http://localhost:3000/auth/notion
   - Authorize your workspace
   - Note the returned User ID

2. **Connect Google Calendar:**
   - Visit: http://localhost:3000/auth/google?userId=YOUR_USER_ID
   - Authorize calendar access

3. **Enable Sync:**
   ```bash
   curl -X POST http://localhost:3000/sync/enable \
     -H "Content-Type: application/json" \
     -d '{"userId": "YOUR_USER_ID"}'
   ```

4. **Test Sync:**
   - Create a task in your Notion database
   - Wait 1 minute (or trigger manual sync)
   - Check your Google Calendar

## 🔍 Troubleshooting

### Common Issues:

1. **"Supabase not configured"**
   - Update your `.env` file with real Supabase credentials
   - Restart the server

2. **"No databases found"**
   - Make sure you have at least one database in your Notion workspace
   - The database should have a title property

3. **OAuth errors**
   - Check that redirect URIs match exactly
   - Ensure OAuth apps are published/enabled

4. **Sync not working**
   - Check that both integrations are connected
   - Verify sync is enabled for the user
   - Check server logs for errors

### Debug Commands:

```bash
# Check server health
curl http://localhost:3000/health

# Check sync status
curl http://localhost:3000/sync/status/YOUR_USER_ID

# Trigger manual sync
curl -X POST http://localhost:3000/sync/trigger \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_USER_ID"}'
```

## 🎉 Success!

Once everything is configured:
- New tasks in Notion will automatically appear in Google Calendar
- Sync runs every minute
- You can enable/disable sync per user
- Check logs for sync activity

Need help? Check the main README.md for more detailed information!