const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || 
    supabaseUrl === 'https://your-project.supabase.co' || 
    supabaseKey === 'your-supabase-anon-key') {
  console.warn('⚠️  Supabase not configured. Database operations will fail.');
  console.warn('   Please update your .env file with real Supabase credentials.');
  
  // Return a mock client for development
  module.exports = {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }),
      upsert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
    })
  };
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);
  module.exports = supabase;
}