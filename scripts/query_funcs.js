import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('finalizar_combate', {
      p_player_id: 1,
      p_enemy_id: 1,
      p_result: 'win',
      p_turn_count: 5,
      p_combat_log: [],
      p_fallback_xp: 100,
      p_fallback_ryous: 50,
      p_enemy_name: 'Test'
  });
  console.log("RPC Error:", error?.message);
}
check();
