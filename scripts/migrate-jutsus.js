import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const jutsus = [
  // --- RANK 1: Estudante da Academia (Dano 15, CP 10, RY 50, Req 5, Selo 5, CD 0) ---
  {
    name: 'Arte Ninja: Passos Leves',
    description: 'Aumenta a velocidade e agilidade básica do usuário. (Foco em Buff)',
    req_rank: 'Estudante da Academia',
    req_level: 1,
    category: 'Ninjutsu',
    type: 'Suporte',
    damage: 15,
    chakra_cost: 10,
    cost_ryous: 50,
    accuracy: 100,
    req_attr_value: 5,
    req_seals: 5,
    cooldown: 0
  },
  {
    name: 'Clone de Ilusão',
    description: 'Cria uma ilusão frágil para distrair o inimigo. (Foco em Debuff)',
    req_rank: 'Estudante da Academia',
    req_level: 1,
    category: 'Genjutsu',
    type: 'Ilusão',
    damage: 15,
    chakra_cost: 10,
    cost_ryous: 50,
    accuracy: 100,
    req_attr_value: 5,
    req_seals: 5,
    cooldown: 0
  },
  {
    name: 'Aquecimento Físico',
    description: 'Prepara os músculos para combate intenso. (Foco em Buff)',
    req_rank: 'Estudante da Academia',
    req_level: 1,
    category: 'Taijutsu',
    type: 'Corpo-a-Corpo',
    damage: 15,
    chakra_cost: 10,
    cost_ryous: 50,
    accuracy: 100,
    req_attr_value: 5,
    req_seals: 5,
    cooldown: 0
  },
  {
    name: 'Arremesso de Shuriken',
    description: 'Dispara shurikens básicas para perfurar a defesa. (Foco em Debuff)',
    req_rank: 'Estudante da Academia',
    req_level: 1,
    category: 'Bukijutsu',
    type: 'Armas',
    damage: 15,
    chakra_cost: 10,
    cost_ryous: 50,
    accuracy: 100,
    req_attr_value: 5,
    req_seals: 5,
    cooldown: 0
  },

  // --- RANK 2: Genin (Dano 40, CP 25, RY 300, Req 15, Selo 15, CD 1) ---
  {
    name: 'Clonagem das Sombras',
    description: 'Cria clones reais que dividem o dano recebido. (Foco em Buff)',
    req_rank: 'Genin',
    req_level: 5,
    category: 'Ninjutsu',
    type: 'Ataque',
    damage: 40,
    chakra_cost: 25,
    cost_ryous: 300,
    accuracy: 100,
    req_attr_value: 15,
    req_seals: 15,
    cooldown: 1
  },
  {
    name: 'Ilusão Demoníaca: Falsa Visão',
    description: 'Confunde o alvo, reduzindo sua precisão. (Foco em Debuff)',
    req_rank: 'Genin',
    req_level: 5,
    category: 'Genjutsu',
    type: 'Ilusão',
    damage: 40,
    chakra_cost: 25,
    cost_ryous: 300,
    accuracy: 100,
    req_attr_value: 15,
    req_seals: 15,
    cooldown: 1
  },
  {
    name: 'Furacão da Folha',
    description: 'Chute giratório devastador que joga o inimigo no ar. (Foco em Buff)',
    req_rank: 'Genin',
    req_level: 5,
    category: 'Taijutsu',
    type: 'Corpo-a-Corpo',
    damage: 40,
    chakra_cost: 25,
    cost_ryous: 300,
    accuracy: 100,
    req_attr_value: 15,
    req_seals: 15,
    cooldown: 1
  },
  {
    name: 'Fios de Aço Cruzados',
    description: 'Prende o alvo temporariamente com fios de aço. (Foco em Debuff)',
    req_rank: 'Genin',
    req_level: 5,
    category: 'Bukijutsu',
    type: 'Armas',
    damage: 40,
    chakra_cost: 25,
    cost_ryous: 300,
    accuracy: 100,
    req_attr_value: 15,
    req_seals: 15,
    cooldown: 1
  },

  // --- RANK 3: Chunin (Dano 90, CP 55, RY 1200, Req 30, Selo 30, CD 2) ---
  {
    name: 'Múltiplos Clones das Sombras',
    description: 'Evolução da técnica de clonagem, sobrecarregando o inimigo. (Foco em Buff)',
    req_rank: 'Chunin',
    req_level: 15,
    category: 'Ninjutsu',
    type: 'Ataque',
    damage: 90,
    chakra_cost: 55,
    cost_ryous: 1200,
    accuracy: 100,
    req_attr_value: 30,
    req_seals: 30,
    cooldown: 2
  },
  {
    name: 'Estilo Ilusão: Queda Infinita',
    description: 'Faz o alvo acreditar que está caindo no vazio, quebrando sua guarda. (Foco em Debuff)',
    req_rank: 'Chunin',
    req_level: 15,
    category: 'Genjutsu',
    type: 'Ilusão',
    damage: 90,
    chakra_cost: 55,
    cost_ryous: 1200,
    accuracy: 100,
    req_attr_value: 30,
    req_seals: 30,
    cooldown: 2
  },
  {
    name: 'Rajada de Leões',
    description: 'Combo aéreo fulminante focado em quebrar a resistência inimiga. (Foco em Buff)',
    req_rank: 'Chunin',
    req_level: 15,
    category: 'Taijutsu',
    type: 'Corpo-a-Corpo',
    damage: 90,
    chakra_cost: 55,
    cost_ryous: 1200,
    accuracy: 100,
    req_attr_value: 30,
    req_seals: 30,
    cooldown: 2
  },
  {
    name: 'Invocação de Armas: Moinho',
    description: 'Dispara uma Fūma Shuriken gigante cortando armaduras. (Foco em Debuff)',
    req_rank: 'Chunin',
    req_level: 15,
    category: 'Bukijutsu',
    type: 'Armas',
    damage: 90,
    chakra_cost: 55,
    cost_ryous: 1200,
    accuracy: 100,
    req_attr_value: 30,
    req_seals: 30,
    cooldown: 2
  },

  // --- RANK 4: Jounin (Dano 180, CP 95, RY 4500, Req 60, Selo 60, CD 3) ---
  {
    name: 'Rasengan',
    description: 'Esfera espiral de puro chakra que moí o inimigo com impacto extremo. (Foco em Buff)',
    req_rank: 'Jounin',
    req_level: 25,
    category: 'Ninjutsu',
    type: 'Ataque',
    damage: 180,
    chakra_cost: 95,
    cost_ryous: 4500,
    accuracy: 100,
    req_attr_value: 60,
    req_seals: 60,
    cooldown: 3
  },
  {
    name: 'Visão do Purgatório',
    description: 'Tortura mental intensa que sela os movimentos do alvo. (Foco em Debuff)',
    req_rank: 'Jounin',
    req_level: 25,
    category: 'Genjutsu',
    type: 'Ilusão',
    damage: 180,
    chakra_cost: 95,
    cost_ryous: 4500,
    accuracy: 100,
    req_attr_value: 60,
    req_seals: 60,
    cooldown: 3
  },
  {
    name: 'Lótus Primária',
    description: 'Agarra o alvo no ar e despenca de cabeça no chão. Requer limite do corpo. (Foco em Buff)',
    req_rank: 'Jounin',
    req_level: 25,
    category: 'Taijutsu',
    type: 'Corpo-a-Corpo',
    damage: 180,
    chakra_cost: 95,
    cost_ryous: 4500,
    accuracy: 100,
    req_attr_value: 60,
    req_seals: 60,
    cooldown: 3
  },
  {
    name: 'Dança das Kunais Explosivas',
    description: 'Chuva de explosivos que anula a defesa e causa dano residual. (Foco em Debuff)',
    req_rank: 'Jounin',
    req_level: 25,
    category: 'Bukijutsu',
    type: 'Armas',
    damage: 180,
    chakra_cost: 95,
    cost_ryous: 4500,
    accuracy: 100,
    req_attr_value: 60,
    req_seals: 60,
    cooldown: 3
  },

  // --- RANK 5: ANBU (Dano 350, CP 160, RY 10000, Req 100, Selo 100, CD 4) ---
  {
    name: 'Rasengan Gigante',
    description: 'Versão avassaladora do Rasengan, engolindo alvos grandes. (Foco em Buff)',
    req_rank: 'ANBU',
    req_level: 35,
    category: 'Ninjutsu',
    type: 'Ataque',
    damage: 350,
    chakra_cost: 160,
    cost_ryous: 10000,
    accuracy: 100,
    req_attr_value: 100,
    req_seals: 100,
    cooldown: 4
  },
  {
    name: 'Prisão de Paralisia Tática',
    description: 'Genjutsu de alto nível usado pelas forças especiais para interrogatório. (Foco em Debuff)',
    req_rank: 'ANBU',
    req_level: 35,
    category: 'Genjutsu',
    type: 'Ilusão',
    damage: 350,
    chakra_cost: 160,
    cost_ryous: 10000,
    accuracy: 100,
    req_attr_value: 100,
    req_seals: 100,
    cooldown: 4
  },
  {
    name: 'Lótus Oculta',
    description: 'Velocidade além da percepção visual desferindo golpes fatais. (Foco em Buff)',
    req_rank: 'ANBU',
    req_level: 35,
    category: 'Taijutsu',
    type: 'Corpo-a-Corpo',
    damage: 350,
    chakra_cost: 160,
    cost_ryous: 10000,
    accuracy: 100,
    req_attr_value: 100,
    req_seals: 100,
    cooldown: 4
  },
  {
    name: 'Tempestade de Pergaminhos',
    description: 'Desencela milhares de armas simultaneamente destruindo a área. (Foco em Debuff)',
    req_rank: 'ANBU',
    req_level: 35,
    category: 'Bukijutsu',
    type: 'Armas',
    damage: 350,
    chakra_cost: 160,
    cost_ryous: 10000,
    accuracy: 100,
    req_attr_value: 100,
    req_seals: 100,
    cooldown: 4
  },

  // --- RANK 6: Sannin (Dano 600, CP 300, RY 25000, Req 150, Selo 150, CD 5) ---
  {
    name: 'Arte Sábia: Super Rasengan',
    description: 'O auge do chakra condensado, capaz de pulverizar montanhas. (Foco em Buff)',
    req_rank: 'Sannin',
    req_level: 45,
    category: 'Ninjutsu',
    type: 'Ataque',
    damage: 600,
    chakra_cost: 300,
    cost_ryous: 25000,
    accuracy: 100,
    req_attr_value: 150,
    req_seals: 150,
    cooldown: 5
  },
  {
    name: 'Tsukuyomi (Adaptação Livre)',
    description: 'Dimensão de tortura mental controlada pelo usuário, quebra espiritual completa. (Foco em Debuff)',
    req_rank: 'Sannin',
    req_level: 45,
    category: 'Genjutsu',
    type: 'Ilusão',
    damage: 600,
    chakra_cost: 300,
    cost_ryous: 25000,
    accuracy: 100,
    req_attr_value: 150,
    req_seals: 150,
    cooldown: 5
  },
  {
    name: 'Oitavo Portão: Elefante do Anoitecer',
    description: 'Golpes que distorcem o próprio ar. Exige sacrifício físico extremo. (Foco em Buff)',
    req_rank: 'Sannin',
    req_level: 45,
    category: 'Taijutsu',
    type: 'Corpo-a-Corpo',
    damage: 600,
    chakra_cost: 300,
    cost_ryous: 25000,
    accuracy: 100,
    req_attr_value: 150,
    req_seals: 150,
    cooldown: 5
  },
  {
    name: 'Arsenal Infinito: Marionete Mestra',
    description: 'Invocação e controle de cem armamentos pesados selando totalmente o inimigo. (Foco em Debuff)',
    req_rank: 'Sannin',
    req_level: 45,
    category: 'Bukijutsu',
    type: 'Armas',
    damage: 600,
    chakra_cost: 300,
    cost_ryous: 25000,
    accuracy: 100,
    req_attr_value: 150,
    req_seals: 150,
    cooldown: 5
  }
];

async function run() {
  console.log('Deletando Jutsus antigos...');
  const { error: delErr } = await supabase.from('jutsus').delete().neq('id', 0);
  if (delErr) {
    console.error('Erro ao deletar:', delErr);
  } else {
    console.log('Inserindo 24 Jutsus Novos...');
    const { error: insErr } = await supabase.from('jutsus').insert(jutsus);
    if (insErr) {
      console.error('Erro ao inserir:', insErr);
    } else {
      console.log('Migração de Jutsus concluída com Sucesso!');
    }
  }
}

run();
