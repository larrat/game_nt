import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { error } = await supabase.rpc('finalizar_combate', {
      p_player_id: 2,
      p_enemy_id: 999999,
      p_result: 'win',
      p_turn_count: 5,
      p_combat_log: ["log1", "log2", "long string ".repeat(500)],
      p_fallback_xp: 100,
      p_fallback_ryous: 50,
      p_enemy_name: 'Test'
  });
  console.log("Error:", error);
}
check();
