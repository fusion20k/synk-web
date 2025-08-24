console.log('Testing Electron import...');

// Test different import methods
try {
  console.log('Method 1: require("electron")');
  const electron1 = require('electron');
  console.log('Type:', typeof electron1);
  console.log('Value:', electron1);
  
  console.log('\nMethod 2: destructuring');
  const { app } = require('electron');
  console.log('App:', app);
  
} catch (error) {
  console.error('Import error:', error.message);
}

console.log('Test complete.');