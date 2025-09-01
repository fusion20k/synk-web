// Debug Electron import
console.log('Debugging Electron import...');

try {
    const electron = require('electron');
    console.log('Electron object:', electron);
    console.log('Electron keys:', Object.keys(electron || {}));
    console.log('App property:', electron?.app);
    
    if (electron && electron.app) {
        console.log('✅ App found');
    } else {
        console.log('❌ App not found');
    }
    
} catch (error) {
    console.error('❌ Electron require failed:', error);
}