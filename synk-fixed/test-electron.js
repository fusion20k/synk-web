// Simple Electron test
console.log('Testing Electron...');
console.log('Process versions:', process.versions);
console.log('Is Electron?', !!process.versions.electron);

try {
  const { app, BrowserWindow } = require('electron');
  console.log('✅ Electron loaded successfully');
  console.log('App:', !!app);
  console.log('BrowserWindow:', !!BrowserWindow);
  
  if (app) {
    app.whenReady().then(() => {
      console.log('✅ Electron app ready');
      
      const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });
      
      win.loadFile('src/index.html');
      console.log('✅ Window created and loaded');
    });
  }
} catch (error) {
  console.error('❌ Failed to load Electron:', error.message);
}