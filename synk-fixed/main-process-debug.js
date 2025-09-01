// Debug Electron process to understand what's available
console.log('=== Electron Process Debug ===');
console.log('process.versions:', process.versions);
console.log('process.type:', process.type);
console.log('process.electronBinding available:', typeof process.electronBinding);

// Check what's available in the global scope
console.log('\n=== Global Scope Debug ===');
console.log('global keys:', Object.keys(global).filter(k => k.includes('electron') || k.includes('app') || k.includes('Browser')));

// Check what's available in the process object
console.log('\n=== Process Object Debug ===');
const processKeys = Object.keys(process).filter(k => k.includes('electron') || k.includes('app') || k.includes('Browser'));
console.log('process keys:', processKeys);

// Try to access electronBinding if available
if (process.electronBinding) {
  console.log('\n=== ElectronBinding Debug ===');
  try {
    const availableBindings = process.electronBinding('electron_common_features');
    console.log('Available bindings:', availableBindings);
  } catch (e) {
    console.log('Could not get available bindings:', e.message);
  }
  
  // Try to get specific bindings
  const bindings = ['app', 'browser_window', 'ipc_main', 'shell'];
  for (const binding of bindings) {
    try {
      const result = process.electronBinding(binding);
      console.log(`${binding}:`, typeof result, result ? '✓' : '✗');
    } catch (e) {
      console.log(`${binding}: failed -`, e.message);
    }
  }
}

// Try different require approaches with more detail
console.log('\n=== Require Approaches Debug ===');
const approaches = [
  { name: 'standard require', fn: () => require('electron') },
  { name: 'module.require', fn: () => module.require('electron') },
  { name: 'eval require', fn: () => eval('require("electron")') },
];

for (const approach of approaches) {
  try {
    console.log(`\nTrying ${approach.name}:`);
    const result = approach.fn();
    console.log('  Type:', typeof result);
    console.log('  Is string:', typeof result === 'string');
    console.log('  Has app:', !!(result && result.app));
    console.log('  Has BrowserWindow:', !!(result && result.BrowserWindow));
    
    if (typeof result === 'string') {
      console.log('  String value:', result);
    } else if (typeof result === 'object') {
      console.log('  Object keys:', Object.keys(result));
    }
  } catch (e) {
    console.log(`  Failed: ${e.message}`);
  }
}

// Check if we're in the right context
console.log('\n=== Context Check ===');
console.log('Running in Electron:', !!process.versions.electron);
console.log('Process type:', process.type);
console.log('Main process:', process.type === 'browser');

// Try to access Electron APIs through different paths
console.log('\n=== Alternative Access Attempts ===');
const paths = [
  'global.electron',
  'global.require',
  'process.mainModule',
  'module.parent',
];

for (const path of paths) {
  try {
    const result = eval(path);
    console.log(`${path}:`, typeof result, result ? '✓' : '✗');
  } catch (e) {
    console.log(`${path}: failed -`, e.message);
  }
}

console.log('\n=== Debug Complete ===');