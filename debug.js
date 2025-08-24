require('dotenv').config();

console.log('=== Environment Variables Debug ===');
console.log('NOTION_TOKEN:', process.env.NOTION_TOKEN ? 'Present' : 'Missing');
console.log('NOTION_DB_ID:', process.env.NOTION_DB_ID ? `Present: "${process.env.NOTION_DB_ID}"` : 'Missing');
console.log('NOTION_DB_ID type:', typeof process.env.NOTION_DB_ID);
console.log('NOTION_DB_ID length:', process.env.NOTION_DB_ID ? process.env.NOTION_DB_ID.length : 'undefined');
console.log('NOTION_DB_ID JSON:', JSON.stringify(process.env.NOTION_DB_ID));

// Test Notion connection
const { Client } = require('@notionhq/client');

function formatDatabaseId(id) {
  // Remove any existing dashes
  const cleanId = id.replace(/-/g, '');
  
  // Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  if (cleanId.length === 32) {
    return `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(16, 20)}-${cleanId.slice(20)}`;
  }
  
  return id; // Return original if not 32 characters
}

async function testConnection() {
  try {
    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
    });

    console.log('\n=== Testing Notion Token ===');
    
    // First, test if the token is valid by listing users
    try {
      const users = await notion.users.list();
      console.log('✅ Token is valid! Found', users.results.length, 'users');
    } catch (tokenError) {
      console.log('❌ Token validation failed:', tokenError.message);
      return;
    }

    console.log('\n=== Testing Database Access ===');
    const rawDbId = process.env.NOTION_DB_ID;
    const formattedDbId = formatDatabaseId(rawDbId);
    
    console.log('Raw DB ID:', rawDbId);
    console.log('Formatted DB ID:', formattedDbId);
    
    // Try to query the database instead of retrieving it
    console.log('Trying to query database...');
    try {
      const response = await notion.databases.query({
        database_id: formattedDbId,
        page_size: 1
      });
      console.log('✅ Database query successful! Found', response.results.length, 'pages');
    } catch (queryError) {
      console.log('❌ Database query failed:', queryError.message);
      
      // Try retrieving database info
      console.log('Trying to retrieve database info...');
      const database = await notion.databases.retrieve(formattedDbId);
      console.log('✅ Database retrieve successful! Title:', database.title[0]?.plain_text || 'Untitled');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testConnection();