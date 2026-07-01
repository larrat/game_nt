import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { error } = await supabase.from('jutsus').update({ req_rank: 'Sannin' }).eq('req_rank', 'Kage');
  if (error) console.error(error);
  else console.log('Rank Kage atualizado para Sannin com sucesso!');
}
run();
