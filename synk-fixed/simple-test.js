// Simple test to see if we can get Electron working
console.log('Starting simple Electron test...');

try {
    // Try different ways to import electron
    console.log('Method 1: Direct require');
    const electron = require('electron');
    console.log('Electron type:', typeof electron);
    console.log('Electron value:', electron);
    
    if (typeof electron === 'string') {
        console.log('Electron returned path, trying to run it differently...');
        
        // This is the issue - when we're inside Electron, require('electron') returns the path
        // We need to use a different approach
        console.log('This is the known issue - we are running inside Electron already');
        console.log('We need to restructure the app to not require electron in the main entry point');
        
        process.exit(1);
    }
    
    const { app, BrowserWindow } = electron;
    console.log('Successfully destructured app and BrowserWindow');
    
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}