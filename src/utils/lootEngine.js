// src/utils/lootEngine.js

import { supabase } from '../supabaseClient';

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Filtra atributos baseados no Smart Loot (Restrições de Classe)
function filterStats(statsArray, ninjaClass) {
  if (!ninjaClass) return [...statsArray];

  return statsArray.filter(stat => {
    // Regra: Se Ninjutsu, remover Tai, Gen, Buk, Stamina, Ataque/Defesa Tai/Buk
    if (ninjaClass.toLowerCase() === 'ninjutsu') {
      if (['Taijutsu', 'Genjutsu', 'Bukijutsu', 'Stamina', 'Ataque Tai/Buk', 'Defesa Tai/Buk'].includes(stat)) return false;
    }
    // Regra: Se Taijutsu
    if (ninjaClass.toLowerCase() === 'taijutsu') {
      if (['Ninjutsu', 'Genjutsu', 'Bukijutsu', 'Chakra', 'Selo', 'Ataque Nin/Gen', 'Defesa Nin/Gen'].includes(stat)) return false;
    }
    // Regra: Se Genjutsu
    if (ninjaClass.toLowerCase() === 'genjutsu') {
      if (['Taijutsu', 'Ninjutsu', 'Bukijutsu', 'Stamina', 'Ataque Tai/Buk', 'Defesa Tai/Buk'].includes(stat)) return false;
    }
    // Regra: Se Bukijutsu
    if (ninjaClass.toLowerCase() === 'bukijutsu') {
      if (['Ninjutsu', 'Genjutsu', 'Taijutsu', 'Chakra', 'Selo', 'Ataque Nin/Gen', 'Defesa Nin/Gen'].includes(stat)) return false;
    }
    return true;
  });
}

function getRandomStat(pool, existingStats) {
  const available = pool.filter(s => !existingStats.some(e => e.name === s));
  if (available.length === 0) return pool[getRandomInt(0, pool.length - 1)]; // Fallback
  return available[getRandomInt(0, available.length - 1)];
}

// Sorteia a raridade com base no rank
export async function rollRarity(playerRank, customRates = null) {
  let rates = customRates;
  if (!rates) {
    const { data } = await supabase.from('loot_drop_rates').select('*').eq('rank_name', playerRank).single();
    rates = data || { common_chance: 85, rare_chance: 10, epic_chance: 4, legendary_chance: 1, unique_chance: 0 };
  }
  
  const roll = getRandomInt(1, 100);
  
  // Chance do Único entra primeiro se existir
  if (rates.unique_chance && roll <= rates.unique_chance) return 'Único';
  if (roll <= (rates.unique_chance || 0) + rates.legendary_chance) return 'Lendário';
  if (roll <= (rates.unique_chance || 0) + rates.legendary_chance + rates.epic_chance) return 'Épico';
  if (roll <= (rates.unique_chance || 0) + rates.legendary_chance + rates.epic_chance + rates.rare_chance) return 'Raro';
  return 'Comum';
}

// Gera os afixos (Rolled Stats) para o equipamento
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
  
  const generateValue = (statName) => {
    const statDef = statTypes?.find(s => s.name === statName);
    if (!statDef) return getRandomInt(2, 10);
    
    // Se for Único, sempre pega o valor máximo possível
    let val = rarity === 'Único' ? statDef.max_value : getRandomInt(statDef.min_value, statDef.max_value);
    if (statDef.is_percentage) return val + '%';
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

  // Regras de Geração (QTD DE AFIXOS)
  if (rarity === 'Comum') {
    addStat('Base');
    addStat('Base');
  } else if (rarity === 'Raro') {
    addStat('Base');
    addStat('Base');
    addRandomAny();
  } else if (rarity === 'Épico') {
    addStat('Base');
    addStat('Base');
    addRandomAny();
    addStat('Fórmula');
  } else if (rarity === 'Lendário') {
    addStat('Base');
    addStat('Base');
    addStat('Base');
    addRandomAny();
    addStat('Fórmula');
  } else if (rarity === 'Único') {
    // 5 Afixos fixos (3 Base, 2 Fórmulas) e maximizados (pela lógica acima)
    addStat('Base');
    addStat('Base');
    addStat('Base');
    addStat('Fórmula');
    addStat('Fórmula');
  }

  // 20% chance de Extra Affix
  if (Math.random() <= 0.20) {
    addRandomAny();
  }

  const rolledStatsObj = {};
  stats.forEach(s => {
    rolledStatsObj[s.name] = s.value;
  });

  return rolledStatsObj;
}
