import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: pData } = await supabase.from('players').select('id, name').ilike('name', '%Luke%');
  if (pData && pData.length > 0) {
    const pid = pData[0].id;
    const { data } = await supabase.from('player_jutsus').select('jutsu_id, jutsus(name)').eq('player_id', pid);
    console.log(data);
  }
}
check();
