import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const elements = [
  { prefix: 'Katon', name: 'Fogo', attr: 'Ninjutsu' },
  { prefix: 'Suiton', name: 'Água', attr: 'Ninjutsu' },
  { prefix: 'Doton', name: 'Terra', attr: 'Ninjutsu' },
  { prefix: 'Futon', name: 'Vento', attr: 'Ninjutsu' },
  { prefix: 'Raiton', name: 'Raio', attr: 'Ninjutsu' }
];

const ranks = [
  { rank: 'Genin', level: 5, damage: 30, cost: 200, chakra: 25, reqAttr: 10, reqSeals: 5, cooldown: 1, suffix: 'Básico' },
  { rank: 'Chunin', level: 15, damage: 80, cost: 800, chakra: 60, reqAttr: 25, reqSeals: 15, cooldown: 2, suffix: 'Avançado' },
  { rank: 'Jounin', level: 30, damage: 180, cost: 2500, chakra: 120, reqAttr: 50, reqSeals: 30, cooldown: 3, suffix: 'Dragão' },
  { rank: 'ANBU', level: 45, damage: 320, cost: 5000, chakra: 200, reqAttr: 80, reqSeals: 50, cooldown: 4, suffix: 'Assassino' },
  { rank: 'Sannin', level: 60, damage: 550, cost: 12000, chakra: 400, reqAttr: 150, reqSeals: 80, cooldown: 5, suffix: 'Lendário' },
  { rank: 'Herói', level: 80, damage: 900, cost: 25000, chakra: 800, reqAttr: 300, reqSeals: 150, cooldown: 6, suffix: 'Divino' }
];

const jutsus = [];

for (const el of elements) {
  for (const r of ranks) {
    jutsus.push({
      name: `${el.prefix}: Estilo ${el.name} ${r.suffix}`,
      description: `Técnica elemental focada no elemento ${el.name}, criada para shinobis de nível ${r.rank}.`,
      type: 'attack',
      category: el.attr,
      req_level: r.level,
      req_rank: r.rank,
      req_attr_value: r.reqAttr,
      req_seals: r.reqSeals,
      damage: r.damage,
      accuracy: 90,
      cooldown: r.cooldown,
      chakra_cost: r.chakra,
      cost_ryous: r.cost,
      is_active: true
    });
  }
}

async function seed() {
  console.log(`Inserindo ${jutsus.length} jutsus...`);
  const { data, error } = await supabase.from('jutsus').insert(jutsus).select();
  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('Sucesso! Inseridos:', data.length);
  }
}

seed();
