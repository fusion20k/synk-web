// Test sync functionality without Electron
require('dotenv').config();

console.log('🧪 Testing sync functionality...');

// Mock electron-store for testing
const mockStore = {
  data: {
    activeSyncPairs: [],
    syncStats: { totalSyncs: 0, successfulSyncs: 0, failedSyncs: 0 },
    lastSyncAt: {}
  },
  get(key, defaultValue) {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  },
  set(key, value) {
    this.data[key] = value;
    console.log(`📝 Store updated: ${key} =`, value);
  }
};

// Mock the Store class
const Store = function() {
  return mockStore;
};

// Replace electron-store with our mock
require.cache[require.resolve('electron-store')] = {
  exports: Store
};

// Now test the sync manager
const SyncManager = require('./src/syncManager');

async function testSync() {
  try {
    console.log('🚀 Initializing SyncManager...');
    const syncManager = new SyncManager();
    
    // Test adding a sync pair
    console.log('➕ Adding test sync pair...');
    syncManager.addSyncPair('test-calendar-id', 'test-database-id');
    
    // Test getting stats
    console.log('📊 Getting sync stats...');
    const stats = syncManager.getStats();
    console.log('Stats:', stats);
    
    // Test triggering a sync (this will fail due to missing tokens, but we can see the flow)
    console.log('🔄 Triggering test sync...');
    syncManager.onLocalChange('test-calendar-id-test-database-id');
    
    // Wait a bit to see the sync attempt
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Sync test completed');
    
  } catch (error) {
    console.error('❌ Sync test failed:', error);
  }
}

testSync();