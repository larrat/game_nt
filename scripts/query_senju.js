import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data } = await supabase.from('jutsus').select('*').eq('req_clan', 'Senju');
  console.log(data);
}
check();
