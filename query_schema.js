import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('player_jutsus')
    .select('jutsu_id, level') // Let's just try selecting jutsu_id and level
    .limit(1);
  console.log(error);
}
check();
