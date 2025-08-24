const express = require('express');
const { testNotionConnection } = require('../services/notionService');

const router = express.Router();

// Setup endpoint that works without database
router.post('/setup', async (req, res) => {
  try {
    console.log('Running setup check...');

    // Test Notion connection
    const notionTest = await testNotionConnection();
    if (!notionTest.success) {
      return res.status(400).json({ 
        error: 'Notion connection failed', 
        details: notionTest.error 
      });
    }

    // Check environment variables
    const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
    const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

    res.json({
      success: true,
      message: 'Setup check completed',
      integrations: {
        notion: {
          connected: true,
          database: notionTest.database
        },
        supabase: {
          configured: hasSupabase,
          note: hasSupabase ? 'Please ensure the users table is created' : 'Not configured'
        },
        google: {
          configured: hasGoogle,
          note: hasGoogle ? 'Ready for OAuth flow' : 'Not configured'
        }
      },
      nextSteps: [
        hasSupabase ? 'Run the SQL schema in your Supabase dashboard' : 'Configure Supabase credentials',
        hasGoogle ? 'Test Google OAuth flow' : 'Configure Google OAuth credentials',
        'Create a user and enable sync'
      ]
    });

  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Setup failed: ' + error.message });
  }
});

module.exports = router;