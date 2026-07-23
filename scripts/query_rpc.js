import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_function_definition', { func_name: 'distribute_boss_rewards' });
  if (error) {
     console.log("No RPC get_function_definition, trying raw SQL using psql if possible or just describe what we can.");
  } else {
     console.log(data);
  }
}
check();
