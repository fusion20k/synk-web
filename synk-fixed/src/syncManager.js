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
    
    try {
      // Get all active sync pairs from storage
      const activeSyncPairs = this.store.get('activeSyncPairs', []);
      
      if (activeSyncPairs.length === 0) {
        console.log('📭 No active sync pairs configured');
        return;
      }
      
      for (const pair of activeSyncPairs) {
        await this.syncPair(pair.googleCalendarId, pair.notionDatabaseId);
      }
      
      console.log('✅ Full sync completed');
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      throw error;
    }
  }

  async performIndividualSync(syncKey) {
    console.log('🔄 Performing individual sync for:', syncKey);
    
    try {
      // Parse sync key format: "googleCalendarId-notionDatabaseId"
      const [googleCalendarId, notionDatabaseId] = syncKey.split('-');
      
      if (!googleCalendarId || !notionDatabaseId) {
        throw new Error(`Invalid sync key format: ${syncKey}`);
      }
      
      await this.syncPair(googleCalendarId, notionDatabaseId);
      console.log(`✅ Individual sync completed: ${syncKey}`);
    } catch (error) {
      console.error(`❌ Individual sync failed for ${syncKey}:`, error);
      throw error;
    }
  }

  async syncPair(googleCalendarId, notionDatabaseId) {
    console.log(`🔄 Syncing ${googleCalendarId} ↔ ${notionDatabaseId}`);
    
    const googleApi = require('./google');
    const notionApi = require('./notion');
    
    try {
      // Get current time range (last 30 days to next 30 days)
      const now = new Date();
      const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Fetch data from both services
      const [googleEvents, notionPages, notionSchema] = await Promise.all([
        googleApi.getCalendarEvents(googleCalendarId, timeMin, timeMax),
        notionApi.getDatabasePages(notionDatabaseId),
        notionApi.getDatabaseSchema(notionDatabaseId)
      ]);
      
      console.log(`📊 Sync data: ${googleEvents.length} Google events, ${notionPages.length} Notion pages`);
      
      // Find the date property in Notion database
      const dateProperty = this.findDateProperty(notionSchema.properties);
      if (!dateProperty) {
        throw new Error('No date property found in Notion database');
      }
      
      // Sync Google events to Notion
      await this.syncGoogleToNotion(googleEvents, notionPages, notionDatabaseId, dateProperty);
      
      // Sync Notion pages to Google
      await this.syncNotionToGoogle(notionPages, googleEvents, googleCalendarId, dateProperty);
      
      console.log(`✅ Sync pair completed: ${googleCalendarId} ↔ ${notionDatabaseId}`);
      
      // Update sync statistics
      this.updateSyncStats(`${googleCalendarId}-${notionDatabaseId}`, true);
    } catch (error) {
      console.error(`❌ Sync pair failed: ${googleCalendarId} ↔ ${notionDatabaseId}`, error);
      this.updateSyncStats(`${googleCalendarId}-${notionDatabaseId}`, false);
      throw error;
    }
  }

  findDateProperty(properties) {
    // Find the first date property in the Notion database
    for (const [name, property] of Object.entries(properties)) {
      if (property.type === 'date') {
        return name;
      }
    }
    return null;
  }

  async syncGoogleToNotion(googleEvents, notionPages, notionDatabaseId, dateProperty) {
    const notionApi = require('./notion');
    
    for (const event of googleEvents) {
      try {
        // Skip events without start time or that are cancelled
        if (!event.start || event.status === 'cancelled') continue;
        
        // Check if this event already exists in Notion (by Google event ID)
        const existingPage = notionPages.find(page => 
          page.properties['Google Event ID']?.rich_text?.[0]?.plain_text === event.id
        );
        
        const eventProperties = this.convertGoogleEventToNotionProperties(event, dateProperty);
        
        if (existingPage) {
          // Update existing page if Google event is newer
          const googleUpdated = new Date(event.updated);
          const notionUpdated = new Date(existingPage.last_edited_time);
          
          if (googleUpdated > notionUpdated) {
            await notionApi.updateDatabasePage(existingPage.id, eventProperties);
            console.log(`📝 Updated Notion page for event: ${event.summary}`);
          }
        } else {
          // Create new page
          await notionApi.createDatabasePage(notionDatabaseId, eventProperties);
          console.log(`➕ Created Notion page for event: ${event.summary}`);
        }
      } catch (error) {
        console.error(`❌ Failed to sync Google event ${event.id}:`, error);
      }
    }
  }

  async syncNotionToGoogle(notionPages, googleEvents, googleCalendarId, dateProperty) {
    const googleApi = require('./google');
    
    for (const page of notionPages) {
      try {
        // Skip pages without date or title
        const dateValue = page.properties[dateProperty]?.date;
        const title = this.extractNotionTitle(page.properties);
        
        if (!dateValue || !title) continue;
        
        // Check if this page already exists in Google Calendar (by Notion page ID)
        const existingEvent = googleEvents.find(event => 
          event.description && event.description.includes(page.id)
        );
        
        const eventData = this.convertNotionPageToGoogleEvent(page, dateProperty);
        
        if (existingEvent) {
          // Update existing event if Notion page is newer
          const notionUpdated = new Date(page.last_edited_time);
          const googleUpdated = new Date(existingEvent.updated);
          
          if (notionUpdated > googleUpdated) {
            await googleApi.updateCalendarEvent(googleCalendarId, existingEvent.id, eventData);
            console.log(`📝 Updated Google event for page: ${title}`);
          }
        } else {
          // Create new event
          await googleApi.createCalendarEvent(googleCalendarId, eventData);
          console.log(`➕ Created Google event for page: ${title}`);
        }
      } catch (error) {
        console.error(`❌ Failed to sync Notion page ${page.id}:`, error);
      }
    }
  }

  convertGoogleEventToNotionProperties(event, dateProperty) {
    const properties = {};
    
    // Title
    if (event.summary) {
      properties['Name'] = {
        title: [{ text: { content: event.summary } }]
      };
    }
    
    // Date
    if (event.start) {
      const startDate = event.start.dateTime || event.start.date;
      const endDate = event.end?.dateTime || event.end?.date;
      
      properties[dateProperty] = {
        date: {
          start: startDate,
          end: endDate || startDate
        }
      };
    }
    
    // Description
    if (event.description) {
      properties['Description'] = {
        rich_text: [{ text: { content: event.description } }]
      };
    }
    
    // Google Event ID for tracking
    properties['Google Event ID'] = {
      rich_text: [{ text: { content: event.id } }]
    };
    
    return properties;
  }

  convertNotionPageToGoogleEvent(page, dateProperty) {
    const title = this.extractNotionTitle(page.properties);
    const dateValue = page.properties[dateProperty]?.date;
    
    const event = {
      summary: title,
      description: `Synced from Notion\nPage ID: ${page.id}\nPage URL: ${page.url}`,
    };
    
    if (dateValue) {
      if (dateValue.start.includes('T')) {
        // DateTime event
        event.start = { dateTime: dateValue.start };
        event.end = { dateTime: dateValue.end || dateValue.start };
      } else {
        // All-day event
        event.start = { date: dateValue.start };
        event.end = { date: dateValue.end || dateValue.start };
      }
    }
    
    return event;
  }

  extractNotionTitle(properties) {
    // Try common title property names
    const titleProps = ['Name', 'Title', 'Task', 'Event'];
    
    for (const propName of titleProps) {
      const prop = properties[propName];
      if (prop?.title?.[0]?.plain_text) {
        return prop.title[0].plain_text;
      }
      if (prop?.rich_text?.[0]?.plain_text) {
        return prop.rich_text[0].plain_text;
      }
    }
    
    return 'Untitled';
  }

  // Method to add/update active sync pairs
  addSyncPair(googleCalendarId, notionDatabaseId) {
    const activePairs = this.store.get('activeSyncPairs', []);
    const existingIndex = activePairs.findIndex(pair => 
      pair.googleCalendarId === googleCalendarId && pair.notionDatabaseId === notionDatabaseId
    );
    
    if (existingIndex === -1) {
      activePairs.push({ googleCalendarId, notionDatabaseId });
      this.store.set('activeSyncPairs', activePairs);
      console.log(`➕ Added sync pair: ${googleCalendarId} ↔ ${notionDatabaseId}`);
    }
  }

  removeSyncPair(googleCalendarId, notionDatabaseId) {
    const activePairs = this.store.get('activeSyncPairs', []);
    const filteredPairs = activePairs.filter(pair => 
      !(pair.googleCalendarId === googleCalendarId && pair.notionDatabaseId === notionDatabaseId)
    );
    
    this.store.set('activeSyncPairs', filteredPairs);
    console.log(`➖ Removed sync pair: ${googleCalendarId} ↔ ${notionDatabaseId}`);
  }

  getStats() {
    return {
      successfulSyncs: this.store.get('successfulSyncs', 0),
      lastSyncTimes: this.store.get('lastSyncTimes', {}),
      activeSyncPairs: this.store.get('activeSyncPairs', [])
    };
  }

  updateSyncStats(syncKey, success = true) {
    if (success) {
      const currentCount = this.store.get('successfulSyncs', 0);
      this.store.set('successfulSyncs', currentCount + 1);
      
      const lastSyncTimes = this.store.get('lastSyncTimes', {});
      lastSyncTimes[syncKey] = new Date().toISOString();
      this.store.set('lastSyncTimes', lastSyncTimes);
    }
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