import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: pData } = await supabase.from('players').select('id, name, jutsus_learned, element').ilike('name', '%Luke%').limit(1);
  const luke = pData[0];
  
  const ids = luke.jutsus_learned.map(j => j.id);
  const { data: jData } = await supabase.from('jutsus').select('id, name').in('id', ids);
  
  console.log("Luke Element:", luke.element);
  console.log("Luke currently has:");
  jData.forEach(j => console.log(j.id, j.name));

  // Let's find his Futon jutsu
  const { data: fData } = await supabase.from('jutsus').select('id, name, req_level, req_rank').eq('element', 'Futon');
  console.log("Futon Jutsus available:");
  fData.forEach(j => console.log(j.id, j.name, j.req_level, j.req_rank));
}
check();
