// src/utils/lootEngine.js

import { supabase } from '../supabaseClient';

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Mapeamento de Categorias de Status baseado nos Prints Oficiais
const STAT_GROUPS = {
  'Inteligência': 'base',
  'Força': 'base',
  'Resistência': 'base',
  'Taijutsu': 'base',
  'Ninjutsu': 'base',
  'Genjutsu': 'base',
  'Bukijutsu': 'base',
  'Agilidade': 'base',
  'Selo': 'base',

  'Energia': 'energia',

  'Ataque Tai/Buk': 'ataque_defesa',
  'Ataque Nin/Gen': 'ataque_defesa',
  'Defesa Tai/Buk': 'ataque_defesa',
  'Defesa Nin/Gen': 'ataque_defesa',

  'Precisão': 'perf_prec',
  'Perfuração': 'perf_prec',

  'HP': 'hp',

  'Chakra': 'chakra_stamina',
  'Stamina': 'chakra_stamina',

  'Concentração': 'secundarios',
  'Percepção': 'secundarios',
  'Convicção': 'secundarios',
  'Determinação': 'secundarios',
  'Dano Crítico': 'secundarios',
  'Absorção': 'secundarios'
};

const RANK_RANGES = {
  'Estudante da Academia': { base: [1, 3], energia: [1, 1], ataque_defesa: [1, 1], perf_prec: [1, 2], hp: [1, 8], chakra_stamina: [1, 4], secundarios: [1, 5] },
  'Genin': { base: [1, 3], energia: [1, 1], ataque_defesa: [1, 1], perf_prec: [1, 2], hp: [1, 8], chakra_stamina: [1, 4], secundarios: [1, 5] },
  'Chunin': { base: [2, 4], energia: [1, 2], ataque_defesa: [1, 2], perf_prec: [2, 4], hp: [8, 16], chakra_stamina: [2, 4], secundarios: [1, 5] },
  'Jonin': { base: [3, 5], energia: [2, 3], ataque_defesa: [2, 2], perf_prec: [3, 5], hp: [12, 24], chakra_stamina: [3, 6], secundarios: [1, 5] },
  'ANBU': { base: [4, 6], energia: [2, 4], ataque_defesa: [2, 3], perf_prec: [4, 6], hp: [16, 32], chakra_stamina: [4, 6], secundarios: [1, 5] },
  'Sannin Lendário': { base: [5, 7], energia: [3, 5], ataque_defesa: [3, 3], perf_prec: [5, 7], hp: [20, 40], chakra_stamina: [4, 8], secundarios: [1, 5] },
  'Herói Mundial': { base: [6, 9], energia: [4, 6], ataque_defesa: [3, 4], perf_prec: [6, 9], hp: [24, 48], chakra_stamina: [6, 8], secundarios: [1, 5] }
};

const DROP_RATES = {
  'Estudante da Academia': { Comum: 85, Raro: 10, Épico: 4, Lendário: 1 },
  'Genin': { Comum: 85, Raro: 10, Épico: 4, Lendário: 1 },
  'Chunin': { Comum: 10, Raro: 80, Épico: 7, Lendário: 3 },
  'Jonin': { Comum: 0, Raro: 63, Épico: 30, Lendário: 7 },
  'ANBU': { Comum: 0, Raro: 20, Épico: 65, Lendário: 15 },
  'Sannin Lendário': { Comum: 0, Raro: 0, Épico: 75, Lendário: 25 },
  'Herói Mundial': { Comum: 0, Raro: 0, Épico: 50, Lendário: 50 }
};

// Filtra atributos baseados no Smart Loot (Restrições de Classe)
function filterStats(statsArray, ninjaClass) {
  if (!ninjaClass) return [...statsArray];

  return statsArray.filter(stat => {
    const s = stat.toLowerCase();
    if (ninjaClass.toLowerCase() === 'ninjutsu') {
      if (['taijutsu', 'genjutsu', 'bukijutsu', 'stamina', 'ataque tai/buk', 'defesa tai/buk'].includes(s)) return false;
    }
    if (ninjaClass.toLowerCase() === 'taijutsu') {
      if (['ninjutsu', 'genjutsu', 'bukijutsu', 'chakra', 'selo', 'ataque nin/gen', 'defesa nin/gen'].includes(s)) return false;
    }
    if (ninjaClass.toLowerCase() === 'genjutsu') {
      if (['taijutsu', 'ninjutsu', 'bukijutsu', 'stamina', 'ataque tai/buk', 'defesa tai/buk'].includes(s)) return false;
    }
    if (ninjaClass.toLowerCase() === 'bukijutsu') {
      if (['ninjutsu', 'genjutsu', 'taijutsu', 'chakra', 'selo', 'ataque nin/gen', 'defesa nin/gen'].includes(s)) return false;
    }
    return true;
  });
}

function getRandomStat(pool, existingStats) {
  const available = pool.filter(s => !existingStats.some(e => e.name === s));
  if (available.length === 0) return pool[getRandomInt(0, pool.length - 1)]; // Fallback
  return available[getRandomInt(0, available.length - 1)];
}

// Sorteia a raridade com base no rank usando a tabela exata
export async function rollRarity(playerRank, customRates = null) {
  // Fallback para caso o playerRank não exista na tabela
  const rank = playerRank || 'Genin';
  const rates = customRates || DROP_RATES[rank] || DROP_RATES['Genin'];
  
  const roll = getRandomInt(1, 100);
  
  // Como as chances somam 100%, validamos progressivamente
  if (roll <= (rates.Lendário || 0)) return 'Lendário';
  if (roll <= (rates.Lendário || 0) + (rates.Épico || 0)) return 'Épico';
  if (roll <= (rates.Lendário || 0) + (rates.Épico || 0) + (rates.Raro || 0)) return 'Raro';
  
  return 'Comum';
}

// Gera os afixos (Rolled Stats) para o equipamento escalado por Graduação
export async function generateLootStats(rarity, playerRank, ninjaClass = '') {
  const { data: statTypes } = await supabase.from('item_stat_types').select('*');
  
  let baseStats = [];
  let formulaStats = [];
  
  if (statTypes) {
    baseStats = statTypes.filter(s => s.stat_type === 'Base').map(s => s.name);
    formulaStats = statTypes.filter(s => s.stat_type === 'Fórmula').map(s => s.name);
  }
  
  const filteredBases = filterStats(baseStats, ninjaClass);
  const filteredFormulas = filterStats(formulaStats, ninjaClass);
  
  const stats = [];
  const rank = playerRank || 'Genin';
  const ranges = RANK_RANGES[rank] || RANK_RANGES['Genin'];
  
  const generateValue = (statName) => {
    const statDef = statTypes?.find(s => s.name === statName);
    
    // Identificar qual grupo matemático do print este status pertence
    const group = STAT_GROUPS[statName] || 'base';
    const range = ranges[group] || [1, 2];
    
    let val = getRandomInt(range[0], range[1]);
    
    if (statDef && statDef.is_percentage) return val + '%';
    return val;
  };

  const addStat = (type) => {
    const pool = type === 'Base' ? filteredBases : filteredFormulas;
    const statName = getRandomStat(pool, stats);
    stats.push({ name: statName, value: generateValue(statName), type });
  };

  const addRandomAny = () => {
    const isBase = Math.random() > 0.5;
    addStat(isBase ? 'Base' : 'Fórmula');
  };

  // Qtd de Atributos Fixos por Raridade
  let fixedAmount = 1; // Comum
  if (rarity === 'Raro') fixedAmount = 2;
  if (rarity === 'Épico') fixedAmount = 3;
  if (rarity === 'Lendário') fixedAmount = 4;
  if (rarity === 'Único') fixedAmount = 5;

  for (let i = 0; i < fixedAmount; i++) {
    // Intercala entre Base e Fórmula
    addStat(i % 2 === 0 ? 'Base' : 'Fórmula');
  }

  // 1 Atributo Extra (Chance) - O print define como uma chance adicional
  if (Math.random() <= 0.30) {
    addRandomAny();
  }

  const rolledStatsObj = {};
  stats.forEach(s => {
    rolledStatsObj[s.name] = s.value;
  });

  return rolledStatsObj;
}
