# Synk - Notion to Google Calendar Sync

A simple automation tool that syncs tasks from Notion to Google Calendar.

## Features

- **OAuth Integration**: Secure authentication with both Notion and Google Calendar
- **Automatic Sync**: Background job runs every minute to sync new tasks
- **Task Detection**: Automatically detects new tasks in your Notion database
- **Calendar Events**: Creates Google Calendar events for each new task
- **User Management**: Enable/disable sync per user
- **Error Handling**: Comprehensive error handling and logging

## Setup Instructions

### 1. Prerequisites

- Node.js (v16 or higher)
- Supabase account
- Notion integration
- Google Cloud Console project

### 2. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `database/schema.sql` in your Supabase SQL editor
3. Note your Supabase URL and anon key

### 3. Notion Integration Setup

1. Go to [Notion Developers](https://developers.notion.com/)
2. Create a new integration
3. Note your Client ID and Client Secret
4. Set redirect URI to: `http://localhost:3000/auth/notion/callback`

### 4. Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:3000/auth/google/callback`
6. Note your Client ID and Client Secret

### 5. Environment Configuration

1. Copy `.env.example` to `.env`
2. Fill in all the required values:

```env
# Server Configuration
PORT=3000

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Notion OAuth Configuration
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
NOTION_REDIRECT_URI=http://localhost:3000/auth/notion/callback

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Application URL
APP_URL=http://localhost:3000
```

### 6. Installation

```bash
npm install
```

### 7. Running the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### OAuth Flows

- `GET /auth/notion` - Start Notion OAuth flow
- `GET /auth/notion/callback` - Notion OAuth callback
- `GET /auth/google?userId=<userId>` - Start Google OAuth flow
- `GET /auth/google/callback` - Google OAuth callback

### Sync Management

- `POST /sync/enable` - Enable sync for a user
- `POST /sync/disable` - Disable sync for a user
- `GET /sync/status/:userId` - Get sync status for a user
- `POST /sync/trigger` - Manual sync trigger (for testing)

### Utility

- `GET /` - API information
- `GET /health` - Health check

## Usage Flow

1. **Notion Integration**:
   - Visit `http://localhost:3000/auth/notion`
   - Authorize the integration
   - Select your tasks database
   - Note the returned `userId`

2. **Google Calendar Integration**:
   - Visit `http://localhost:3000/auth/google?userId=<your-user-id>`
   - Authorize Google Calendar access

3. **Enable Sync**:
   ```bash
   curl -X POST http://localhost:3000/sync/enable \
     -H "Content-Type: application/json" \
     -d '{"userId": "your-user-id"}'
   ```

4. **Check Status**:
   ```bash
   curl http://localhost:3000/sync/status/your-user-id
   ```

## How It Works

1. **Background Sync**: A cron job runs every minute checking for users with sync enabled
2. **Task Detection**: For each user, queries Notion for tasks created since last sync
3. **Event Creation**: Creates corresponding Google Calendar events
4. **State Tracking**: Updates last sync time to avoid duplicates

## Notion Database Requirements

Your Notion database should have these properties (case-insensitive):
- **Title/Name/Task**: The task title (required)
- **Description/Notes**: Task description (optional)
- **Due Date/Date/Deadline**: When the task is due (optional)

## Error Handling

- Failed syncs are logged with details
- Individual task failures don't stop the entire sync
- Token refresh is handled automatically for Google OAuth
- Comprehensive error responses for API calls

## Development

### Project Structure

```
synk/
├── config/
│   └── database.js          # Supabase configuration
├── routes/
│   ├── notionOAuth.js       # Notion OAuth routes
│   ├── googleOAuth.js       # Google OAuth routes
│   └── sync.js              # Sync management routes
├── services/
│   ├── syncService.js       # Core sync logic
│   └── scheduler.js         # Cron job scheduler
├── database/
│   └── schema.sql           # Database schema
├── index.js                 # Main application file
└── package.json
```

### Adding Features

- Modify `syncService.js` to change sync logic
- Update `scheduler.js` to change sync frequency
- Add new routes in the `routes/` directory

## Troubleshooting

### Common Issues

1. **"Missing Supabase configuration"**: Check your `.env` file
2. **"No databases found"**: Make sure you have a database in Notion
3. **"Failed to exchange code for token"**: Check OAuth credentials
4. **"Token expired"**: Tokens are refreshed automatically

### Logs

Check the console output for detailed sync logs and error messages.

## Security Notes

- Store sensitive credentials in environment variables
- Use HTTPS in production
- Implement proper session management for production use
- Consider rate limiting for API endpoints

## License

MIT License