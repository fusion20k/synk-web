const fetch = require('node-fetch');
const { getNotionToken } = require('./oauth');

async function listDatabases() {
  try {
    const tokens = await getNotionToken();
    
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
      // If demo mode is enabled and we get an error, return sample data
      if (process.env.DEMO_MODE === 'true') {
        console.log('Demo mode: returning sample database data');
        return getSampleDatabases();
      }
      
      throw new Error(`Notion API error: ${databaseResponse.status}`);
    }

    const databaseData = await databaseResponse.json();
    
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
    
    return {
      databases: databaseData.results.map(db => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || 'Untitled Database',
        url: db.url,
        created_time: db.created_time,
        last_edited_time: db.last_edited_time,
        properties: Object.keys(db.properties || {})
      })),
      pages: pageData.results.map(page => ({
        id: page.id,
        title: page.properties?.title?.title?.[0]?.plain_text || 'Untitled Page',
        url: page.url,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time
      }))
    };
  } catch (error) {
    console.error('Error fetching Notion data:', error);
    
    // If demo mode is enabled, return sample data on error
    if (process.env.DEMO_MODE === 'true') {
      console.log('Demo mode: returning sample database data due to error');
      return getSampleDatabases();
    }
    
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

module.exports = {
  listDatabases
};