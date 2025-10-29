// Final attempt to access Electron APIs
console.log('=== Final Electron API Test ===');

// Check if we're in Electron
if (process.versions.electron) {
    console.log('✓ Running in Electron environment');
    
    // Try different ways to access Electron APIs
    let app, BrowserWindow, ipcMain, shell;
    
    // Method 1: Check if APIs are available globally
    if (typeof global !== 'undefined') {
        console.log('Checking global object...');
        if (global.require) {
            try {
                const electron = global.require('electron');
                console.log('Global require electron type:', typeof electron);
                if (typeof electron === 'object') {
                    ({ app, BrowserWindow, ipcMain, shell } = electron);
                    console.log('✓ Got APIs from global.require');
                }
            } catch (e) {
                console.log('Global require failed:', e.message);
            }
        }
    }
    
    // Method 2: Check process.electronBinding
    if (!app && process.electronBinding) {
        console.log('Trying process.electronBinding...');
        try {
            // This is an internal API but might work
            const binding = process.electronBinding('electron_common_app');
            console.log('electronBinding result:', typeof binding);
        } catch (e) {
            console.log('electronBinding failed:', e.message);
        }
    }
    
    // Method 3: Check if APIs are directly available on process
    if (!app && process.app) {
        console.log('Found app on process object');
        app = process.app;
    }
    
    // Method 4: Try accessing through module cache
    if (!app) {
        console.log('Checking module cache...');
        const Module = require('module');
        const cache = Module._cache;
        for (const key in cache) {
            if (key.includes('electron') && cache[key].exports) {
                console.log('Found electron in cache:', key);
                const exports = cache[key].exports;
                if (exports && typeof exports === 'object' && exports.app) {
                    ({ app, BrowserWindow, ipcMain, shell } = exports);
                    console.log('✓ Got APIs from module cache');
                    break;
                }
            }
        }
    }
    
    if (app && app.whenReady) {
        console.log('✓ SUCCESS: Found working Electron APIs');
        console.log('App type:', typeof app);
        console.log('BrowserWindow type:', typeof BrowserWindow);
        console.log('ipcMain type:', typeof ipcMain);
        console.log('shell type:', typeof shell);
        
        // Test the app
        app.whenReady().then(() => {
            console.log('✓ App ready event fired');
            app.quit();
        });
    } else {
        console.log('✗ FAILED: Could not access Electron APIs');
        console.log('This Electron environment appears to be broken');
        process.exit(1);
    }
    
} else {
    console.log('✗ Not running in Electron environment');
    process.exit(1);
}