const { getNewTasks, getTaskTitle, getTaskDescription, getTaskDueDate } = require('./notionService');
const { getGoogleCalendarClient } = require('../routes/googleOAuth');
const supabase = require('../config/database');

// Sync tasks for a specific user
async function syncUserTasks(userId) {
  try {
    console.log(`Starting sync for user: ${userId}`);

    // Get user data
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    if (!user.sync_enabled) {
      console.log(`Sync disabled for user: ${userId}`);
      return { skipped: true, reason: 'Sync disabled' };
    }

    if (!user.google_access_token) {
      throw new Error('Missing Google Calendar integration');
    }

    // Initialize Google Calendar client
    const calendar = await getGoogleCalendarClient(userId);

    // Get last sync time or default to 24 hours ago
    const lastSyncTime = user.last_sync_time 
      ? new Date(user.last_sync_time)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log(`Last sync time for user ${userId}: ${lastSyncTime.toISOString()}`);

    // Get new tasks from Notion using internal token
    const newTasks = await getNewTasks(lastSyncTime);
    console.log(`Found ${newTasks.length} new tasks for user ${userId}`);

    let syncedCount = 0;
    let errors = [];

    // Process each new task
    for (const task of newTasks) {
      try {
        await createGoogleCalendarEvent(task, calendar);
        syncedCount++;
        console.log(`Synced task: ${getTaskTitle(task)}`);
      } catch (error) {
        console.error(`Failed to sync task ${task.id}:`, error);
        errors.push({
          taskId: task.id,
          title: getTaskTitle(task),
          error: error.message
        });
      }
    }

    // Update last sync time
    await supabase
      .from('users')
      .update({
        last_sync_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    const result = {
      userId,
      totalTasks: newTasks.length,
      syncedCount,
      errors,
      lastSyncTime: new Date().toISOString()
    };

    console.log(`Sync completed for user ${userId}:`, result);
    return result;

  } catch (error) {
    console.error(`Sync failed for user ${userId}:`, error);
    throw error;
  }
}

// Sync for the default user (MVP approach)
async function syncDefaultUser() {
  try {
    console.log('Starting sync for default user...');

    // For MVP, we'll use a default user approach
    // First, check if we have any users with Google integration
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('sync_enabled', true)
      .limit(1);

    if (error) {
      console.error('Error fetching users:', error);
      return { error: 'Database error' };
    }

    if (!users || users.length === 0) {
      console.log('No users with sync enabled found');
      return { skipped: true, reason: 'No users with sync enabled' };
    }

    // Sync the first enabled user
    return await syncUserTasks(users[0].id);

  } catch (error) {
    console.error('Error in syncDefaultUser:', error);
    throw error;
  }
}

// Create Google Calendar event from Notion task
async function createGoogleCalendarEvent(notionTask, calendar) {
  const title = getTaskTitle(notionTask);
  const description = getTaskDescription(notionTask);
  const dueDate = getTaskDueDate(notionTask);

  // Create event object
  const event = {
    summary: title,
    description: description,
    start: {
      dateTime: dueDate ? dueDate.toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Default to 1 hour from now
      timeZone: 'UTC'
    },
    end: {
      dateTime: dueDate ? new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString() : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 1 hour duration
      timeZone: 'UTC'
    },
    source: {
      title: 'Synk - Notion Task',
      url: notionTask.url
    }
  };

  // Create the event
  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event
  });

  return response.data;
}

// Sync all enabled users
async function syncAllUsers() {
  try {
    console.log('Starting sync for all users...');

    // For MVP, just sync the default user
    return await syncDefaultUser();

  } catch (error) {
    console.error('Error in syncAllUsers:', error);
    throw error;
  }
}

module.exports = {
  syncUserTasks,
  syncDefaultUser,
  syncAllUsers
};