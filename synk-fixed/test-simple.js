console.log('Node version:', process.version);
console.log('Platform:', process.platform);

try {
  console.log('Attempting to require electron...');
  const electron = require('electron');
  console.log('Success! Electron type:', typeof electron);
  console.log('Electron constructor:', electron.constructor.name);
  console.log('Has app?', 'app' in electron);
  console.log('App type:', typeof electron.app);
} catch (error) {
  console.error('Failed to require electron:', error.message);
  console.error('Stack:', error.stack);
}