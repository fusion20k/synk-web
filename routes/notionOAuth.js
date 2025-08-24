const express = require('express');
const { Client } = require('@notionhq/client');
const supabase = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Start Notion OAuth flow
router.get('/', (req, res) => {
  const state = uuidv4(); // Generate a random state for security
  const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${process.env.NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(process.env.NOTION_REDIRECT_URI)}&state=${state}`;
  
  // Store state in session or temporary storage (for production, use proper session management)
  res.cookie('notion_oauth_state', state, { httpOnly: true, maxAge: 600000 }); // 10 minutes
  
  res.redirect(notionAuthUrl);
});

// Handle Notion OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const storedState = req.cookies?.notion_oauth_state;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' });
    }

    // Verify state parameter (in production, implement proper state verification)
    if (state !== storedState) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.NOTION_REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Notion token exchange error:', tokenData);
      return res.status(400).json({ error: 'Failed to exchange code for token' });
    }

    const { access_token, workspace_id, workspace_name, workspace_icon } = tokenData;

    // Initialize Notion client to get databases
    const notion = new Client({ auth: access_token });

    // Search for databases
    const databases = await notion.search({
      filter: {
        property: 'object',
        value: 'database'
      }
    });

    // For MVP, we'll look for a database named "Tasks" or let user select
    let tasksDatabase = databases.results.find(db => 
      db.title && db.title.some(title => 
        title.plain_text.toLowerCase().includes('task')
      )
    );

    if (!tasksDatabase && databases.results.length > 0) {
      // If no "Tasks" database found, use the first available database
      tasksDatabase = databases.results[0];
    }

    if (!tasksDatabase) {
      return res.status(400).json({ 
        error: 'No databases found in your Notion workspace. Please create a database first.' 
      });
    }

    // Store or update user data in Supabase
    const userId = uuidv4();
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        notion_token: access_token,
        notion_db_id: tasksDatabase.id,
        workspace_id: workspace_id,
        workspace_name: workspace_name,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'workspace_id'
      });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to save user data' });
    }

    // Clear the state cookie
    res.clearCookie('notion_oauth_state');

    res.json({
      success: true,
      message: 'Notion integration successful',
      workspace: workspace_name,
      database: tasksDatabase.title[0]?.plain_text || 'Selected Database',
      userId: userId
    });

  } catch (error) {
    console.error('Notion OAuth error:', error);
    res.status(500).json({ error: 'Internal server error during Notion OAuth' });
  }
});

// Get user's Notion databases (for database selection)
router.get('/databases/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's Notion token
    const { data: user, error } = await supabase
      .from('users')
      .select('notion_token')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const notion = new Client({ auth: user.notion_token });

    const databases = await notion.search({
      filter: {
        property: 'object',
        value: 'database'
      }
    });

    const formattedDatabases = databases.results.map(db => ({
      id: db.id,
      title: db.title[0]?.plain_text || 'Untitled Database',
      url: db.url
    }));

    res.json({ databases: formattedDatabases });

  } catch (error) {
    console.error('Error fetching databases:', error);
    res.status(500).json({ error: 'Failed to fetch databases' });
  }
});

// Update user's selected database
router.post('/database/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { databaseId } = req.body;

    if (!databaseId) {
      return res.status(400).json({ error: 'Database ID is required' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ 
        notion_db_id: databaseId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Database update error:', error);
      return res.status(500).json({ error: 'Failed to update database selection' });
    }

    res.json({ success: true, message: 'Database updated successfully' });

  } catch (error) {
    console.error('Error updating database:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;