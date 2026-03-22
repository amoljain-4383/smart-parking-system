// Supabase integration

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'your_supabase_url';
const supabaseKey = 'your_supabase_key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Example function to fetch data
async function fetchData() {
  const { data, error } = await supabase
    .from('your_table_name')
    .select('*');

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  console.log('Data fetched:', data);
}

fetchData();
