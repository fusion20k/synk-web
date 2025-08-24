const express = require('express');
const supabase = require('../config/database');

const router = express.Router();

// Enable sync for a user
router.post('/enable', async (req, res) => {
  try {
    let { userId } = req.body;

    // If no userId provided, get the first user (MVP approach)
    if (!userId) {
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (fetchError || !users || users.length === 0) {
        return res.status(400).json({ error: 'No user found. Please run user setup first.' });
      }

      userId = users[0].id;
    }

    // Check if user exists and has both integrations
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.google_access_token) {
      return res.status(400).json({ error: 'Google Calendar integration not completed' });
    }

    // Enable sync
    const { data, error: updateError } = await supabase
      .from('users')
      .update({
        sync_enabled: true,
        last_sync_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Database error:', updateError);
      return res.status(500).json({ error: 'Failed to enable sync' });
    }

    res.json({
      success: true,
      message: 'Sync enabled successfully',
      userId: userId
    });

  } catch (error) {
    console.error('Enable sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disable sync for a user
router.post('/disable', async (req, res) => {
  try {
    let { userId } = req.body;

    // If no userId provided, get the first user (MVP approach)
    if (!userId) {
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (fetchError || !users || users.length === 0) {
        return res.status(400).json({ error: 'No user found. Please run user setup first.' });
      }

      userId = users[0].id;
    }

    // Disable sync
    const { data, error } = await supabase
      .from('users')
      .update({
        sync_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to disable sync' });
    }

    res.json({
      success: true,
      message: 'Sync disabled successfully',
      userId: userId
    });

  } catch (error) {
    console.error('Disable sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sync status for a user
router.get('/status/:userId?', async (req, res) => {
  try {
    let { userId } = req.params;

    // If no userId provided, get the first user (MVP approach)
    if (!userId) {
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

      if (fetchError || !users || users.length === 0) {
        return res.json({
          userExists: false,
          message: 'No user found. Please run user setup first.'
        });
      }

      userId = users[0].id;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasNotionIntegration = !!(process.env.NOTION_TOKEN && process.env.NOTION_DB_ID);
    const hasGoogleIntegration = !!user.google_access_token;

    res.json({
      userId: user.id,
      sync_enabled: user.sync_enabled || false,
      last_sync_time: user.last_sync_time,
      integrations: {
        notion: hasNotionIntegration,
        google: hasGoogleIntegration
      },
      ready_to_sync: hasNotionIntegration && hasGoogleIntegration
    });

  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual sync trigger (for testing)
router.post('/trigger', async (req, res) => {
  try {
    let { userId } = req.body;

    // If no userId provided, get the first user (MVP approach)
    if (!userId) {
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (fetchError || !users || users.length === 0) {
        return res.status(400).json({ error: 'No user found. Please run user setup first.' });
      }

      userId = users[0].id;
    }

    // Import sync service
    const { syncUserTasks } = require('../services/syncService');
    
    const result = await syncUserTasks(userId);

    res.json({
      success: true,
      message: 'Manual sync completed',
      result: result
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ error: 'Manual sync failed: ' + error.message });
  }
});

module.exports = router;