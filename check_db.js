import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('items').select('*').limit(1);
  console.log("Items:", data ? "Exists" : error.message);
  
  const { data: d2, error: e2 } = await supabase.from('consumables').select('*').limit(1);
  console.log("Consumables:", d2 ? "Exists" : e2.message);
}
check();
