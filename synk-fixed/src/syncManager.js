const Store = require('electron-store');

// Helper function for sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class SyncManager {
  constructor() {
    this.queue = new Set(); // list of sync jobs (unique by pair)
    this.debounceTimer = null;
    this.syncInProgress = false;
    // Use SYNC_INTERVAL from .env, fallback to 60 seconds
    this.pollIntervalMs = parseInt(process.env.SYNC_INTERVAL) || 60000;
    this.backoffMs = 1000;
    this.pollTimer = null;
    
    // Persistent storage for sync diagnostics
    this.store = new Store({
      name: 'sync-data',
      defaults: {
        lastSyncAt: {},
        syncStats: {
          totalSyncs: 0,
          successfulSyncs: 0,
          failedSyncs: 0
        }
      }
    });

    console.log('🔄 SyncManager initialized');
    this.startPeriodicPoll();
  }

  // called whenever a user creates/edits/deletes an item locally
  onLocalChange(syncKey) {
    console.log('📝 Local change detected:', syncKey);
    this.queue.add(syncKey);
    
    // small buffer so rapid multi-changes collapse
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flushQueue(), 1200); // 1.2s buffer
  }

  // flush queue and run sync worker
  async flushQueue() {
    if (this.syncInProgress || this.queue.size === 0) return;
    
    console.log(`🚀 Starting sync batch with ${this.queue.size} jobs`);
    this.syncInProgress = true;
    const jobs = Array.from(this.queue);
    this.queue.clear();
    
    try {
      for (const job of jobs) {
        await this.performSync(job); // implement actual sync logic
      }
      this.backoffMs = 1000; // reset backoff on success
      
      // Update success stats
      const stats = this.store.get('syncStats');
      stats.successfulSyncs += jobs.length;
      stats.totalSyncs += jobs.length;
      this.store.set('syncStats', stats);
      
      console.log('✅ Sync batch completed successfully');
      
    } catch (err) {
      console.error('❌ Sync failed', err);
      
      // push failed jobs back in queue
      jobs.forEach(j => this.queue.add(j));
      
      // Update failure stats
      const stats = this.store.get('syncStats');
      stats.failedSyncs += jobs.length;
      stats.totalSyncs += jobs.length;
      this.store.set('syncStats', stats);
      
      // exponential backoff before next attempt
      console.log(`⏳ Backing off for ${this.backoffMs}ms before retry`);
      await sleep(this.backoffMs);
      this.backoffMs = Math.min(this.backoffMs * 2, 60_000);
      
    } finally {
      this.syncInProgress = false;
    }
  }

  async performSync(job) {
    console.log('🔄 Performing sync for job:', job);
    
    try {
      if (job === 'full-poll') {
        // Full sync - check for remote changes
        await this.performFullSync();
      } else {
        // Individual sync job
        await this.performIndividualSync(job);
      }
      
      // Update lastSyncAt for this job
      const lastSyncData = this.store.get('lastSyncAt');
      lastSyncData[job] = new Date().toISOString();
      this.store.set('lastSyncAt', lastSyncData);
      
    } catch (error) {
      console.error(`❌ Sync failed for job ${job}:`, error.message);
      throw error; // Re-throw to trigger backoff logic
    }
  }

  async performFullSync() {
    console.log('🔄 Performing full sync (checking remote changes)');
    
    // TODO: Implement full sync logic
    // This should:
    // 1. Check Google Calendar for new/updated events
    // 2. Check Notion for new/updated pages
    // 3. Sync bidirectionally based on timestamps
    
    // For now, simulate sync work
    await sleep(500);
    console.log('✅ Full sync completed');
  }

  async performIndividualSync(syncKey) {
    console.log('🔄 Performing individual sync for:', syncKey);
    
    // TODO: Implement individual sync logic
    // syncKey format could be: "google-calendar-123:notion-db-456"
    // or "notion-page-789:google-event-101"
    
    // Parse sync key to determine what to sync
    const [source, target] = syncKey.split(':');
    
    // For now, simulate sync work
    await sleep(200);
    console.log(`✅ Individual sync completed: ${source} → ${target}`);
  }

  startPeriodicPoll() {
    const intervalMinutes = Math.round(this.pollIntervalMs / 60000);
    console.log(`⏰ Starting periodic sync poll (every ${intervalMinutes} minute${intervalMinutes !== 1 ? 's' : ''}) - ALWAYS ENABLED`);
    
    this.pollTimer = setInterval(() => {
      console.log('⏰ Periodic sync poll triggered');
      // enqueue a full sync job that checks for remote changes
      this.queue.add('full-poll'); // implement logic for 'full-poll'
      this.flushQueue();
    }, this.pollIntervalMs);
  }

  stop() {
    console.log('🛑 Stopping SyncManager');
    clearInterval(this.pollTimer);
    clearTimeout(this.debounceTimer);
    this.pollTimer = null;
  }

  // Get sync statistics for diagnostics
  getSyncStats() {
    return {
      ...this.store.get('syncStats'),
      lastSyncTimes: this.store.get('lastSyncAt'),
      queueSize: this.queue.size,
      syncInProgress: this.syncInProgress,
      backoffMs: this.backoffMs
    };
  }

  // Clear sync data (for settings/reset)
  clearSyncData() {
    console.log('🗑️ Clearing sync data');
    this.store.clear();
    this.queue.clear();
    clearTimeout(this.debounceTimer);
  }
}

// Export singleton instance
module.exports = new SyncManager();