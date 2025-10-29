// Debug script to understand what's happening with Electron
console.log('=== Electron Debug ===');

try {
    console.log('1. Attempting to require electron...');
    const electron = require('electron');
    console.log('2. Electron object type:', typeof electron);
    console.log('3. Electron object:', electron);
    
    if (typeof electron === 'string') {
        console.log('4. Electron is a string (path), this is the problem!');
        console.log('5. Path:', electron);
    } else if (typeof electron === 'object') {
        console.log('4. Electron is an object, checking properties...');
        console.log('5. Keys:', Object.keys(electron));
        console.log('6. app property:', electron.app);
        console.log('7. BrowserWindow property:', electron.BrowserWindow);
    }
    
    // Try destructuring
    console.log('8. Attempting destructuring...');
    const { app, BrowserWindow } = electron;
    console.log('9. app:', typeof app, app);
    console.log('10. BrowserWindow:', typeof BrowserWindow, BrowserWindow);
    
} catch (error) {
    console.log('ERROR:', error.message);
    console.log('Stack:', error.stack);
}

console.log('=== End Debug ===');