// Test main.js
const { app, BrowserWindow } = require('electron');

console.log('App object:', !!app);
console.log('App methods:', Object.getOwnPropertyNames(app));

app.whenReady().then(() => {
  console.log('App is ready!');
  const win = new BrowserWindow({
    width: 800,
    height: 600
  });
  win.loadURL('data:text/html,<h1>Test Window</h1>');
});