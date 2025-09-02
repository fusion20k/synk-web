// index.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { startScheduler } = require("./services/scheduler");

const app = express();
const port = process.env.PORT || 3000;

// Routes
const notionOAuthRoutes = require("./routes/notionOAuth");
const googleOAuthRoutes = require("./routes/googleOAuth");
const syncRoutes = require("./routes/sync");
const userRoutes = require("./routes/user");
const setupRoutes = require("./routes/setup");

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());

// Serve static files
app.use(express.static('public'));

// CORS middleware for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// OAuth routes
app.use("/auth/notion", notionOAuthRoutes);
app.use("/auth/google", googleOAuthRoutes);

// Desktop client OAuth endpoints (production server polling)
app.use("/", googleOAuthRoutes); // This allows /oauth2callback and /api/oauth/result

// Setup routes
app.use("/setup", setupRoutes);

// User management routes
app.use("/user", userRoutes);

// Sync routes
app.use("/sync", syncRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Synk API is running - MVP with Internal Notion Token",
    version: "1.0.0",
    setup: {
      setup_check: "POST /setup/setup",
      user_setup: "POST /user/setup",
      user_status: "GET /user/status"
    },
    auth: {
      google_auth: "GET /auth/google?userId=<id>"
    },
    sync: {
      sync_enable: "POST /sync/enable",
      sync_disable: "POST /sync/disable",
      sync_status: "GET /sync/status",
      sync_trigger: "POST /sync/trigger"
    },
    test_interface: "/test.html"
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Debug endpoint to check environment variables
app.get("/debug/env", (req, res) => {
  res.json({
    notion_token: process.env.NOTION_TOKEN ? 'Present' : 'Missing',
    notion_db_id: process.env.NOTION_DB_ID ? `Present: ${process.env.NOTION_DB_ID}` : 'Missing',
    supabase_url: process.env.SUPABASE_URL ? 'Present' : 'Missing',
    google_client_id: process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing',
    port: process.env.PORT
  });
});

// Test Notion connection directly
app.get("/debug/notion", async (req, res) => {
  try {
    const { testNotionConnection } = require('./services/notionService');
    const result = await testNotionConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const server = app.listen(port, () => {
  console.log(`🚀 Synk server listening on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  
  // Start the sync scheduler
  try {
    startScheduler();
    console.log("✅ Sync scheduler started");
  } catch (error) {
    console.error("❌ Failed to start sync scheduler:", error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
