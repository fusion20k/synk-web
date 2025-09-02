const { app, BrowserWindow } = require('electron');

console.log('Electron imported successfully');
console.log('app:', typeof app);
console.log('BrowserWindow:', typeof BrowserWindow);

if (app && app.whenReady) {
  console.log('app.whenReady exists');
} else {
  console.log('app.whenReady is missing!');
}