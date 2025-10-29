// Debug Electron loading
const path = require('path');

console.log('=== ELECTRON DEBUG ===');
console.log('process.versions:', process.versions);
console.log('process.type:', process.type);
console.log('process.argv:', process.argv);

// Try different ways to load Electron
console.log('\n=== LOADING ATTEMPTS ===');

try {
  console.log('1. Direct require...');
  const electron1 = require('electron');
  console.log('electron1 type:', typeof electron1);
  console.log('electron1 keys:', Object.keys(electron1).slice(0, 10));
  
  if (typeof electron1 === 'object' && electron1.app) {
    console.log('✓ Method 1 worked!');
    console.log('app type:', typeof electron1.app);
    console.log('app.whenReady type:', typeof electron1.app.whenReady);
  }
} catch (e) {
  console.log('✗ Method 1 failed:', e.message);
}

try {
  console.log('\n2. Destructured require...');
  const { app: app2 } = require('electron');
  console.log('app2 type:', typeof app2);
  console.log('app2:', app2);
} catch (e) {
  console.log('✗ Method 2 failed:', e.message);
}

try {
  console.log('\n3. Module resolution...');
  const electronPath = require.resolve('electron');
  console.log('Electron resolved to:', electronPath);
  
  const electronModule = require(electronPath);
  console.log('electronModule type:', typeof electronModule);
  console.log('electronModule keys:', Object.keys(electronModule).slice(0, 10));
} catch (e) {
  console.log('✗ Method 3 failed:', e.message);
}

try {
  console.log('\n4. Process mainModule...');
  if (process.mainModule && process.mainModule.require) {
    const electron4 = process.mainModule.require('electron');
    console.log('electron4 type:', typeof electron4);
    console.log('electron4 keys:', Object.keys(electron4).slice(0, 10));
  }
} catch (e) {
  console.log('✗ Method 4 failed:', e.message);
}

console.log('\n=== GLOBAL CHECKS ===');
console.log('global.require:', typeof global.require);
console.log('global.process:', typeof global.process);

// Check if electron is available globally
if (typeof global !== 'undefined') {
  console.log('global keys:', Object.keys(global).filter(k => k.includes('electron')));
}

console.log('\n=== MODULE CACHE ===');
const electronInCache = Object.keys(require.cache).filter(k => k.includes('electron'));
console.log('Electron modules in cache:', electronInCache.slice(0, 5));

process.exit(0);