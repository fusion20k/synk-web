const cron = require('node-cron');
const { syncAllUsers } = require('./syncService');

// Schedule sync to run every minute
function startScheduler() {
  console.log('Starting sync scheduler...');
  
  // Run every minute: '* * * * *'
  // For production, you might want to run less frequently, e.g., every 5 minutes: '*/5 * * * *'
  const task = cron.schedule('* * * * *', async () => {
    try {
      console.log('Running scheduled sync...');
      await syncAllUsers();
    } catch (error) {
      console.error('Scheduled sync failed:', error);
    }
  }, {
    scheduled: false // Don't start immediately
  });

  // Start the task
  task.start();
  
  console.log('Sync scheduler started - running every minute');
  
  return task;
}

// Stop the scheduler
function stopScheduler(task) {
  if (task) {
    task.stop();
    console.log('Sync scheduler stopped');
  }
}

module.exports = {
  startScheduler,
  stopScheduler
};