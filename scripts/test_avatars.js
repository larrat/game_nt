import { supabase } from './src/supabaseClient.js';
async function run() {
  const avatarUrl = '/images/avatares/sasuke_01_kunai.png';
  const { data, error } = await supabase.from('avatars').select('*').eq('id', avatarUrl).single();
  console.log('Avatars data:', data);
  if (error) console.error('Error:', error);
}
run();
