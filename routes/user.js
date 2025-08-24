const express = require('express');
const supabase = require('../config/database');
const { testNotionConnection } = require('../services/notionService');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Create or get default user for MVP
router.post('/setup', async (req, res) => {
  try {
    console.log('Setting up default user...');

    // Test Notion connection first
    const notionTest = await testNotionConnection();
    if (!notionTest.success) {
      return res.status(400).json({ 
        error: 'Notion connection failed', 
        details: notionTest.error 
      });
    }

    // Check if we already have a user
    const { data: existingUsers, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (fetchError) {
      console.error('Database error:', fetchError);
      return res.status(500).json({ error: 'Database error' });
    }

    let user;
    if (existingUsers && existingUsers.length > 0) {
      // Use existing user
      user = existingUsers[0];
      console.log('Using existing user:', user.id);
    } else {
      // Create new user
      const userId = uuidv4();
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          notion_token: process.env.NOTION_TOKEN, // Store for reference
          notion_db_id: process.env.NOTION_DB_ID,
          sync_enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      user = newUser;
      console.log('Created new user:', user.id);
    }

    res.json({
      success: true,
      message: 'User setup completed',
      user: {
        id: user.id,
        hasGoogleIntegration: !!user.google_access_token,
        syncEnabled: user.sync_enabled,
        lastSyncTime: user.last_sync_time
      },
      notion: {
        connected: true,
        database: notionTest.database
      }
    });

  } catch (error) {
    console.error('User setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user status
router.get('/status', async (req, res) => {
  try {
    // Get the first user (MVP approach)
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!users || users.length === 0) {
      return res.json({
        userExists: false,
        message: 'No user found. Please run setup first.'
      });
    }

    const user = users[0];
    const notionTest = await testNotionConnection();

    res.json({
      userExists: true,
      user: {
        id: user.id,
        syncEnabled: user.sync_enabled,
        lastSyncTime: user.last_sync_time,
        hasGoogleIntegration: !!user.google_access_token
      },
      integrations: {
        notion: notionTest.success,
        google: !!user.google_access_token
      },
      readyToSync: notionTest.success && !!user.google_access_token
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;