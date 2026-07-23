import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data } = await supabase.from('player_jutsus').select('jutsu_id, level, slot1, slot2, slot3, jutsus(*)').eq('player_id', 1);
  console.log(data);
}
check();
