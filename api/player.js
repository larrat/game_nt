import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase usando Variáveis de Ambiente da Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default async function handler(req, res) {
  // CORS Headers para caso o Frontend (Vercel) tente acessar
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Faltou o ID do jogador" });

    // Busca o jogador e cruza os dados com a Vila usando JOIN do Supabase
    const { data: dbPlayer, error } = await supabase
      .from('players')
      .select('*, villages(*)')
      .eq('id', id)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Traduz do banco Relacional para o JSON que a nossa Engine Frontend espera
    const translatedState = {
      player: {
        name: dbPlayer.name,
        level: dbPlayer.level,
        classe: dbPlayer.class,
        baseStats: { 
          tai: dbPlayer.tai, nin: dbPlayer.nin, gen: dbPlayer.gen, buk: dbPlayer.buk, stamina_pts: dbPlayer.stamina_pts 
        },
        bonusStats: { tai: 0, nin: 0, gen: 0, buk: 0, vel: 0, hp_cost: 0, b_tai: 0, b_nin: 0 },
        equipmentStats: { tai: 0, nin: 0, gen: 0, buk: 0, vel: 0, def: 0 },
        activeJutsus: [] // Pode ser buscado da tabela player_jutsus depois
      },
      village: {
        level: dbPlayer.villages ? dbPlayer.villages.level : 0,
        xp: dbPlayer.villages ? dbPlayer.villages.xp : 0
      }
    };

    return res.status(200).json(translatedState);
  }

  if (req.method === 'POST') {
    const { id, player, village } = req.body;
    if (!id) return res.status(400).json({ error: "Faltou o ID do jogador para salvar" });

    // 1. Atualizar a Vila (No protótipo, ID 1)
    if (village) {
      await supabase.from('villages').upsert({
        id: 1,
        name: 'Vila da Folha',
        level: village.level,
        xp: village.xp
      });
    }

    // 2. Atualizar o Jogador Relacionalmente
    const { data, error } = await supabase
      .from('players')
      .upsert({
        id: id,
        name: player.name,
        class: player.classe,
        level: player.level,
        stamina_pts: player.baseStats.stamina_pts,
        tai: player.baseStats.tai,
        nin: player.baseStats.nin,
        gen: player.baseStats.gen,
        buk: player.baseStats.buk,
        village_id: 1
      })
      .select();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: "Salvo de forma relacional!", data });
  }

  return res.status(405).json({ message: "Método HTTP não permitido." });
}
