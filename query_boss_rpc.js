import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_rpc_source', { rpc_name: 'distribute_boss_rewards' });
  if (error) {
    // try direct SQL if we had pg, but we don't.
    console.log("No RPC get_rpc_source.");
  } else {
    console.log(data);
  }
}
check();
