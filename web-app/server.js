// server.js - Simple static file server for the web app
const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

// Serve static files from web-app directory
app.use(express.static(path.join(__dirname)));

// API proxy to main Synk server
app.use('/api', (req, res) => {
  // Proxy requests to main server on port 3000
  const url = `http://localhost:3000${req.path}`;
  res.json({ message: 'Proxy to main server', url });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Web app server running', port: PORT });
});

app.listen(PORT, () => {
  console.log(`🚀 Synk Web App running at http://localhost:${PORT}`);
  console.log('📱 Open this URL in your browser to use Synk');
  console.log('🔧 Make sure the main Synk server is running on port 3000');
});