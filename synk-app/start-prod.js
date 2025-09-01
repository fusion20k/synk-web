// Production startup script with proper environment handling
process.env.NODE_ENV = 'production';

// Import and start the main application
require('./main.js');