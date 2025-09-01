// Minimal Electron test
console.log('Testing Electron import...');

try {
    const { app, BrowserWindow } = require('electron');
    console.log('✅ Electron imported successfully');
    console.log('App object:', typeof app);
    
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
        
        win.loadFile('index.html');
        
        setTimeout(() => {
            app.quit();
        }, 3000);
    });
    
} catch (error) {
    console.error('❌ Electron import failed:', error);
}