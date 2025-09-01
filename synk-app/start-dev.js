// Development startup script with proper environment handling
process.env.NODE_ENV = 'development';

// Start Electron with the main application
const { spawn } = require('child_process');
const path = require('path');

// Start the main application
require('./main.js');