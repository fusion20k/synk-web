// Alternative Electron loader to fix module resolution issue
const path = require('path');
const fs = require('fs');

// Try to find the actual Electron module
function loadElectron() {
  const possiblePaths = [
    path.join(__dirname, 'node_modules', 'electron', 'index.js'),
    path.join(__dirname, 'node_modules', 'electron', 'dist', 'index.js'),
    path.join(__dirname, 'node_modules', 'electron', 'lib', 'index.js'),
    require.resolve('electron/index.js'),
    require.resolve('electron')
  ];

  for (const electronPath of possiblePaths) {
    try {
      if (fs.existsSync(electronPath)) {
        console.log('Trying to load Electron from:', electronPath);
        const electron = require(electronPath);
        if (typeof electron === 'object' && electron.app) {
          console.log('✓ Successfully loaded Electron module');
          return electron;
        }
      }
    } catch (error) {
      console.log('Failed to load from:', electronPath, error.message);
    }
  }

  throw new Error('Could not load Electron module');
}

module.exports = loadElectron;