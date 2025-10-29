// Test Electron API loading
console.log('Testing Electron API loading...');

try {
  const electron = require('electron');
  console.log('Electron object:', typeof electron);
  console.log('Electron keys:', Object.keys(electron));
  console.log('Electron.app:', typeof electron.app);
  console.log('Electron.BrowserWindow:', typeof electron.BrowserWindow);
  
  // Try different ways to access
  console.log('\nTrying different access methods:');
  console.log('electron.app:', !!electron.app);
  console.log('electron.BrowserWindow:', !!electron.BrowserWindow);
  console.log('electron.ipcMain:', !!electron.ipcMain);
  
  // Check if it's a function or object
  if (typeof electron.app === 'function') {
    console.log('app is a function');
  } else if (typeof electron.app === 'object') {
    console.log('app is an object');
  }
  
} catch (error) {
  console.error('Error:', error.message);
}