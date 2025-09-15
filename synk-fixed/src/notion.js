const fetch = require('node-fetch');
const { getNotionToken } = require('./oauth');

async function listDatabases() {
  try {
    console.log('[Notion] Starting to fetch databases...');
    const tokens = await getNotionToken();
    console.log('[Notion] 🔑 Token exists:', tokens ? 'YES' : 'NO');
    console.log('[Notion] 🔑 Token details:', tokens ? { access_token: tokens.access_token ? 'EXISTS' : 'MISSING' } : 'NO TOKEN');
    console.log('[Notion] 🌐 API endpoint: https://api.notion.com/v1/search');
    console.log('[Notion] Making API call...');
    
    // First, get all databases
    const databaseResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          value: 'database',
          property: 'object'
        },
        page_size: 100
      })
    });

    if (!databaseResponse.ok) {
      const errorText = await databaseResponse.text();
      console.error('[Notion] Database API error:', databaseResponse.status, errorText);
      throw new Error(`Notion API error: ${databaseResponse.status} - ${errorText}`);
    }

    const databaseData = await databaseResponse.json();
    console.log('[DEBUG] NOTION_RAW_RESPONSE:', JSON.stringify(databaseData, null, 2));
    console.log('[Notion] 📊 Total databases returned:', databaseData.results?.length || 0);
    
    // Log each database's key properties
    if (databaseData.results) {
      databaseData.results.forEach((db, index) => {
        console.log(`[Notion] Database ${index + 1}:`, {
          id: db.id,
          title: db.title,
          url: db.url,
          object: db.object,
          created_time: db.created_time,
          properties: Object.keys(db.properties || {})
        });
      });
    } else {
      console.log('[Notion] ⚠️ No results array in response');
    }
    
    // Also get pages
    const pageResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          value: 'page',
          property: 'object'
        },
        page_size: 50
      })
    });

    const pageData = pageResponse.ok ? await pageResponse.json() : { results: [] };
    console.log('[Notion] 🔍 RAW PAGES API RESPONSE:', JSON.stringify(pageData, null, 2));
    console.log('[Notion] 📊 Total pages returned:', pageData.results?.length || 0);
    
    // Filter databases to show only calendar-like databases
    // A calendar database should have at least one Date property
    const calendarDatabases = databaseData.results.filter(db => {
      const properties = db.properties || {};
      const hasDateProperty = Object.values(properties).some(prop => 
        prop.type === 'date' || prop.type === 'created_time' || prop.type === 'last_edited_time'
      );
      
      // Also check if the title suggests it's a calendar/content calendar
      const title = db.title?.[0]?.plain_text?.toLowerCase() || '';
      const isCalendarLike = title.includes('calendar') || title.includes('content') || 
                            title.includes('schedule') || title.includes('event') ||
                            title.includes('timeline') || title.includes('plan');
      
      const isCalendarDatabase = hasDateProperty || isCalendarLike;
      
      if (isCalendarDatabase) {
        console.log(`[Notion] ✅ Calendar database found: "${db.title?.[0]?.plain_text}" (Date properties: ${Object.values(properties).filter(p => p.type === 'date').length})`);
      }
      
      return isCalendarDatabase;
    });

    console.log(`[Notion] 📅 Filtered ${calendarDatabases.length} calendar databases from ${databaseData.results.length} total databases`);

    const result = {
      databases: calendarDatabases.map(db => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || 'Untitled Database',
        url: db.url,
        created_time: db.created_time,
        last_edited_time: db.last_edited_time,
        properties: Object.keys(db.properties || {}),
        dateProperties: Object.entries(db.properties || {})
          .filter(([key, prop]) => prop.type === 'date')
          .map(([key, prop]) => key)
      })),
      pages: pageData.results.map(page => ({
        id: page.id,
        title: page.properties?.title?.title?.[0]?.plain_text || 'Untitled Page',
        url: page.url,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time
      }))
    };
    
    console.log('[DEBUG] NOTION_RAW_RESPONSE:', JSON.stringify(databaseData, null, 2));
    console.log('[Notion] Final result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error fetching Notion data:', error);
    throw error;
  }
}

function getSampleDatabases() {
  return {
    databases: [
      {
        id: 'sample-db-1',
        title: 'Content Calendar',
        url: 'https://notion.so/sample-db-1',
        created_time: '2024-01-01T00:00:00.000Z',
        last_edited_time: '2024-01-15T12:00:00.000Z',
        properties: ['Title', 'Status', 'Date', 'Author'],
        _demo: true
      },
      {
        id: 'sample-db-2',
        title: 'Project Tasks',
        url: 'https://notion.so/sample-db-2',
        created_time: '2024-01-01T00:00:00.000Z',
        last_edited_time: '2024-01-20T15:30:00.000Z',
        properties: ['Task', 'Assignee', 'Due Date', 'Priority'],
        _demo: true
      },
      {
        id: 'sample-db-3',
        title: 'Meeting Notes',
        url: 'https://notion.so/sample-db-3',
        created_time: '2024-01-01T00:00:00.000Z',
        last_edited_time: '2024-01-25T09:15:00.000Z',
        properties: ['Meeting', 'Date', 'Attendees', 'Action Items'],
        _demo: true
      }
    ],
    pages: [
      {
        id: 'sample-page-1',
        title: 'Welcome to Synk',
        url: 'https://notion.so/sample-page-1',
        created_time: '2024-01-01T00:00:00.000Z',
        last_edited_time: '2024-01-10T10:00:00.000Z',
        _demo: true
      },
      {
        id: 'sample-page-2',
        title: 'Getting Started Guide',
        url: 'https://notion.so/sample-page-2',
        created_time: '2024-01-01T00:00:00.000Z',
        last_edited_time: '2024-01-12T14:30:00.000Z',
        _demo: true
      }
    ]
  };
}

async function getDatabasePages(databaseId) {
  try {
    const tokens = await getNotionToken();
    
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page_size: 100
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Notion] Fetched ${data.results?.length || 0} pages from database ${databaseId}`);
    
    return data.results || [];
  } catch (error) {
    console.error('Error fetching Notion database pages:', error);
    throw error;
  }
}

async function createDatabasePage(databaseId, properties) {
  try {
    const tokens = await getNotionToken();
    
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: properties
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Notion] Created page: ${data.id}`);
    return data;
  } catch (error) {
    console.error('Error creating Notion page:', error);
    throw error;
  }
}

async function updateDatabasePage(pageId, properties) {
  try {
    const tokens = await getNotionToken();
    
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: properties
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Notion] Updated page: ${data.id}`);
    return data;
  } catch (error) {
    console.error('Error updating Notion page:', error);
    throw error;
  }
}

async function getDatabaseSchema(databaseId) {
  try {
    const tokens = await getNotionToken();
    
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Notion] Fetched schema for database ${databaseId}`);
    return data;
  } catch (error) {
    console.error('Error fetching Notion database schema:', error);
    throw error;
  }
}

module.exports = {
  listDatabases,
  getDatabasePages,
  createDatabasePage,
  updateDatabasePage,
  getDatabaseSchema
};