const { Client } = require('@notionhq/client');

// Initialize Notion client dynamically
function getNotionClient() {
  if (!process.env.NOTION_TOKEN) {
    throw new Error('NOTION_TOKEN not found in environment variables');
  }
  
  return new Client({
    auth: process.env.NOTION_TOKEN,
  });
}

// Format database ID as UUID
function formatDatabaseId(id) {
  if (!id) return id;
  
  // Remove any existing dashes
  const cleanId = id.replace(/-/g, '');
  
  // Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  if (cleanId.length === 32) {
    return `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(16, 20)}-${cleanId.slice(20)}`;
  }
  
  return id; // Return original if not 32 characters
}

// Get tasks from the configured database
async function getNewTasks(lastSyncTime) {
  try {
    if (!process.env.NOTION_TOKEN || !process.env.NOTION_DB_ID) {
      throw new Error('Notion configuration missing. Please check NOTION_TOKEN and NOTION_DB_ID in .env');
    }

    console.log(`Fetching tasks from Notion database: ${process.env.NOTION_DB_ID}`);
    console.log(`Last sync time: ${lastSyncTime ? lastSyncTime.toISOString() : 'Never'}`);

    const notion = getNotionClient();

    // Query for new tasks since last sync
    const filter = lastSyncTime ? {
      and: [
        {
          property: 'Created time',
          created_time: {
            after: lastSyncTime.toISOString()
          }
        }
      ]
    } : undefined;

    const response = await notion.databases.query({
      database_id: formatDatabaseId(process.env.NOTION_DB_ID),
      filter: filter,
      sorts: [
        {
          property: 'Created time',
          direction: 'ascending'
        }
      ]
    });

    console.log(`Found ${response.results.length} tasks`);
    return response.results;

  } catch (error) {
    console.error('Error fetching tasks from Notion:', error);
    throw error;
  }
}

// Extract task title from Notion page
function getTaskTitle(notionTask) {
  const properties = notionTask.properties;
  
  // Common title property names
  const titleProperties = ['Name', 'Title', 'Task', 'name', 'title', 'task'];
  
  for (const propName of titleProperties) {
    if (properties[propName]) {
      const prop = properties[propName];
      if (prop.type === 'title' && prop.title.length > 0) {
        return prop.title[0].plain_text;
      }
      if (prop.type === 'rich_text' && prop.rich_text.length > 0) {
        return prop.rich_text[0].plain_text;
      }
    }
  }

  // Fallback to first title property found
  for (const [propName, prop] of Object.entries(properties)) {
    if (prop.type === 'title' && prop.title.length > 0) {
      return prop.title[0].plain_text;
    }
  }

  return 'Untitled Task';
}

// Extract task description from Notion page
function getTaskDescription(notionTask) {
  const properties = notionTask.properties;
  
  // Look for description properties
  const descriptionProperties = ['Description', 'Notes', 'Details', 'description', 'notes', 'details'];
  
  for (const propName of descriptionProperties) {
    if (properties[propName] && properties[propName].type === 'rich_text') {
      const richText = properties[propName].rich_text;
      if (richText.length > 0) {
        return richText.map(text => text.plain_text).join('');
      }
    }
  }

  return `Task from Notion: ${notionTask.url}`;
}

// Extract due date from Notion task
function getTaskDueDate(notionTask) {
  const properties = notionTask.properties;
  
  // Look for date properties
  const dateProperties = ['Due Date', 'Date', 'Due', 'Deadline', 'due_date', 'date', 'due', 'deadline'];
  
  for (const propName of dateProperties) {
    if (properties[propName] && properties[propName].type === 'date') {
      const dateValue = properties[propName].date;
      if (dateValue && dateValue.start) {
        return new Date(dateValue.start);
      }
    }
  }

  return null; // No due date found
}

// Test Notion connection
async function testNotionConnection() {
  try {
    console.log('Testing Notion connection...');
    console.log('NOTION_TOKEN:', process.env.NOTION_TOKEN ? 'Present' : 'Missing');
    console.log('NOTION_DB_ID:', process.env.NOTION_DB_ID ? `Present: ${process.env.NOTION_DB_ID}` : 'Missing');

    if (!process.env.NOTION_TOKEN || !process.env.NOTION_DB_ID) {
      throw new Error('Notion configuration missing. Please check NOTION_TOKEN and NOTION_DB_ID in .env');
    }

    // Try to query the database to test connection
    const notion = getNotionClient();
    const dbId = formatDatabaseId(process.env.NOTION_DB_ID);
    console.log('Testing database connection with ID:', dbId);
    
    const response = await notion.databases.query({
      database_id: dbId,
      page_size: 1
    });
    
    return {
      success: true,
      database: {
        id: dbId,
        title: 'Connected Database',
        pages: response.results.length,
        hasMore: response.has_more
      }
    };

  } catch (error) {
    console.error('Notion connection test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getNewTasks,
  getTaskTitle,
  getTaskDescription,
  getTaskDueDate,
  testNotionConnection
};