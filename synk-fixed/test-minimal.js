// Minimal Electron test
console.log('Testing Electron module resolution...');

try {
  // Test 1: Direct require
  console.log('Test 1: Direct require');
  const electron = require('electron');
  console.log('Electron type:', typeof electron);
  console.log('Electron is string:', typeof electron === 'string');
  
  if (typeof electron === 'object' && electron.app) {
    console.log('✓ Electron module loaded correctly');
    const { app, BrowserWindow } = electron;
    
    app.whenReady().then(() => {
      console.log('✓ Electron app ready');
      const win = new BrowserWindow({ width: 400, height: 300 });
      win.loadURL('data:text/html,<h1>Test Window</h1>');
      
      setTimeout(() => {
        console.log('✓ Test complete, closing...');
        app.quit();
      }, 2000);
    });
    
  } else {
    console.log('✗ Electron module resolution failed');
    console.log('Electron value:', electron);
    process.exit(1);
  }
  
} catch (error) {
  console.error('✗ Error requiring electron:', error);
  process.exit(1);
}