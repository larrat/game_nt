import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: row, error: rowErr } = await supabase.from('player_inventory').select('*').limit(1);
  console.log('Row:', row);
}

check();
