import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data } = await supabase.from('jutsus').select('id, name, req_rank, req_level, chakra_cost');
  
  const ranks = ['Estudante da Academia', 'Genin', 'Chunin', 'Jounin', 'ANBU', 'Sannin Lendário'];
  
  for (const rank of ranks) {
    const rankJutsus = data.filter(j => j.req_rank === rank);
    if (rankJutsus.length === 0) continue;
    const avgCost = rankJutsus.reduce((acc, j) => acc + (j.chakra_cost || 0), 0) / rankJutsus.length;
    console.log(`Rank: ${rank.padEnd(20)} | Avg Chakra Cost: ${avgCost.toFixed(2)} | Num Jutsus: ${rankJutsus.length}`);
  }
}
check();
