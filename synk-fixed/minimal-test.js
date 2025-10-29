// Minimal Electron test
console.log('=== Minimal Electron Test ===');

// Test 1: Check if we're in Node.js or Electron
console.log('Process versions:', process.versions);
console.log('Process type:', process.type);

// Test 2: Try to access electron
try {
    console.log('Attempting to require electron...');
    const electron = require('electron');
    console.log('Electron type:', typeof electron);
    
    if (typeof electron === 'string') {
        console.log('ERROR: Electron returned path instead of object');
        console.log('This indicates a fundamental Electron environment issue');
        process.exit(1);
    }
    
    console.log('SUCCESS: Electron returned object');
    const { app } = electron;
    console.log('App object:', typeof app);
    
    if (app && app.whenReady) {
        console.log('SUCCESS: app.whenReady is available');
        app.whenReady().then(() => {
            console.log('SUCCESS: Electron app is ready');
            app.quit();
        });
    } else {
        console.log('ERROR: app.whenReady not available');
        process.exit(1);
    }
    
} catch (error) {
    console.log('ERROR requiring electron:', error.message);
    process.exit(1);
}