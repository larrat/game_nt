import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: pData } = await supabase.from('players').select('id, name, jutsus_learned, element, clan').ilike('name', '%Luke%').limit(1);
  const luke = pData[0];
  
  let newJutsus = luke.jutsus_learned.filter(j => j.id !== 26 && j.id !== 44 && j.id !== 68); // Remove Katon, Chidori, etc.
  
  // Let's add Futon jutsus he should have (level 24, Genin)
  // Futon: Palma Vendaval (39, lvl 10), Futon: Foice de Vento (40, lvl 15)
  if (!newJutsus.find(j => j.id === 39)) newJutsus.push({ id: 39, level: 1, slots: [null, null, null] });
  if (!newJutsus.find(j => j.id === 40)) newJutsus.push({ id: 40, level: 1, slots: [null, null, null] });
  
  // Let's add his Senju jutsus that he might have learned:
  // Estaca de Madeira (52)
  if (!newJutsus.find(j => j.id === 52)) newJutsus.push({ id: 52, level: 1, slots: [null, null, null] });

  await supabase.from('players').update({ jutsus_learned: newJutsus }).eq('id', luke.id);
  console.log("Luke fixed.");
}
check();
