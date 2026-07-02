import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('--- Iniciando Bateria de Testes RPC de Combate ---');

  // Buscar primeiro jogador da base para testar
  const { data: players, error: fetchError } = await supabase
    .from('players')
    .select('id, name')
    .limit(1);

  if (fetchError || !players || players.length === 0) {
    console.error('Erro ao buscar player para o teste:', fetchError);
    return;
  }

  const playerId = players[0].id;
  console.log(`Usando jogador: ${players[0].name} (${playerId})`);

  // NPC Mock
  const npcStats = {
    def: 50,
    element: 'Futon'
  };

  // Teste 1: Ataque Básico (Hit/Esquiva/Crítico)
  console.log('\n[Teste 1] Ataque Básico:');
  const { data: res1, error: err1 } = await supabase.rpc('resolver_turno_combate', {
    p_player_id: playerId,
    p_action: 'basic',
    p_target_type: 'npc',
    p_target_id: null,
    p_npc_stats: npcStats
  });
  
  if (err1) console.error('Erro RPC 1:', err1);
  else console.log('Resultado Ataque Básico:', res1);

  // Teste 2: Jutsu com Dano Mágico
  console.log('\n[Teste 2] Uso de Jutsu (Katon fireball):');
  const jutsuPayload = {
    name: 'Katon: Goukakyu no Jutsu',
    category: 'ninjutsu',
    element: 'Katon',
    damage: 30,
    chakraCost: 20,
    accuracy: 90,
    effects: []
  };

  const { data: res2, error: err2 } = await supabase.rpc('resolver_turno_combate', {
    p_player_id: playerId,
    p_action: 'jutsu',
    p_jutsu_payload: jutsuPayload,
    p_target_type: 'npc',
    p_target_id: null,
    p_npc_stats: npcStats
  });

  if (err2) console.error('Erro RPC 2:', err2);
  else console.log('Resultado Jutsu:', res2);

  // Teste 3: Jutsu com Status Effect (Stun/Silence/DOT)
  console.log('\n[Teste 3] Jutsu com Status Effects:');
  const jutsuStatusPayload = {
    name: 'Raiton: Chidori',
    category: 'ninjutsu',
    element: 'Raiton',
    damage: 40,
    chakraCost: 35,
    accuracy: 100,
    effects: [
      { type: 'paralyze', duration: 2, chance: 50 },
      { type: 'dot', damage: 10, duration: 3 }
    ]
  };

  const { data: res3, error: err3 } = await supabase.rpc('resolver_turno_combate', {
    p_player_id: playerId,
    p_action: 'jutsu',
    p_jutsu_payload: jutsuStatusPayload,
    p_target_type: 'npc',
    p_npc_stats: npcStats
  });

  if (err3) console.error('Erro RPC 3:', err3);
  else console.log('Resultado Jutsu c/ Status:', res3);

  console.log('\nTestes finalizados!');
}

runTests();
