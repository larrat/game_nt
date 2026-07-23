import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('player_jutsus').select('jutsu_id, level, slot1, slot2, slot3, jutsus(*)').limit(1);
  console.log("err:", error);
  console.log("data:", data);
}
check();
