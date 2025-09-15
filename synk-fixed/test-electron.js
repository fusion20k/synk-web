// Test Electron import
console.log('Testing Electron import...');

try {
  const electron = require('electron');
  console.log('Electron type:', typeof electron);
  console.log('Electron keys:', Object.keys(electron));
  console.log('App type:', typeof electron.app);
  console.log('BrowserWindow type:', typeof electron.BrowserWindow);
} catch (error) {
  console.error('Error importing Electron:', error);
}