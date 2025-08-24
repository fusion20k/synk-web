require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabase() {
  console.log('=== Testing Supabase Connection ===');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  console.log('Supabase URL:', supabaseUrl ? 'Present' : 'Missing');
  console.log('Supabase Key:', supabaseKey ? 'Present' : 'Missing');
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test connection by trying to select from users table
    console.log('Testing users table...');
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Users table error:', error.message);
      console.log('This likely means the table doesn\'t exist yet.');
      console.log('Please run the SQL schema in your Supabase dashboard.');
    } else {
      console.log('✅ Users table exists and is accessible');
      console.log('Data:', data);
    }
    
  } catch (error) {
    console.log('❌ Supabase connection error:', error.message);
  }
}

testSupabase();