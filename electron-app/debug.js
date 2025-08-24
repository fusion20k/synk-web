console.log('Starting debug...');

try {
  const electron = require('electron');
  console.log('Electron object:', electron);
  console.log('App object:', electron.app);
  console.log('BrowserWindow:', electron.BrowserWindow);
} catch (error) {
  console.error('Error requiring electron:', error);
}

console.log('Debug complete.');