import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { error } = await supabase.from('battle_logs').insert({
    player_id: 1,
    enemy_name: 'Dummy',
    result: 'win',
    xp_gained: 10,
    ryous_gained: 10,
    turn_count: 1,
    combat_log: []
  });
  console.log(error);
}
check();
