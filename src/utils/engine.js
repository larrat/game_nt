/**
 * Fórmulas Matemáticas do Motor (Engine) do Kurokage
 */

export const getEquipmentBonus = (player, statName) => {
  if (!player || !player.equipped_items || !Array.isArray(player.equipped_items)) return 0;
  return player.equipped_items.reduce((total, item) => {
    if (item && item.bonus_stats && item.bonus_stats[statName]) {
      return total + Number(item.bonus_stats[statName]);
    }
    return total;
  }, 0);
};


// Retorna a quantidade TOTAL de XP necessária para o jogador ALCANÇAR o nível especificado.
export const calculateXPForLevel = (level) => {
  if (level <= 1) return 0;
  return Math.floor(500 * Math.pow(level, 1.8));
};

// Dado o XP total do jogador, retorna qual é o seu nível atual.
export const calculateLevelFromXP = (totalXp) => {
  let level = 1;
  while (totalXp >= calculateXPForLevel(level + 1)) {
    level++;
  }
  return level;
};

// --- FÓRMULAS DA VILA ---

// Vilas precisam de mais esforço conjunto, curva ligeiramente diferente.
export const calculateVillageXPForLevel = (level) => {
  if (level <= 1) return 0;
  return Math.floor(2000 * Math.pow(level, 1.5));
};

export const calculateVillageLevelFromXP = (totalXp) => {
  let level = 1;
  while (totalXp >= calculateVillageXPForLevel(level + 1)) {
    level++;
  }
  return level;
};

// --- FÓRMULAS DE COMBATE AVANÇADAS (Status Baseados nos 10 Atributos) ---

export const calculateHP = (player) => {
  if (!player) return 100;
  // Level escala mais forte anti-hitkill e Energia agora dá HP
  const base = 100 + ((player.level || 1) * 30) + ((player.resistencia || 0) * 10) + ((player.energia || 0) * 5);
  return base + getEquipmentBonus(player, 'hp');
};

export const calculateChakra = (player) => {
  if (!player) return 50;
  const base = 50 + ((player.level || 1) * 10) + ((player.energia || 0) * 3) + ((player.ninjutsu || 0) * 3) + ((player.genjutsu || 0) * 3);
  return base + getEquipmentBonus(player, 'chakra');
};

export const calculateStamina = (player) => {
  if (!player) return 50;
  const base = 50 + ((player.level || 1) * 10) + ((player.energia || 0) * 3) + ((player.taijutsu || 0) * 3) + ((player.bukijutsu || 0) * 3);
  return base + getEquipmentBonus(player, 'stamina');
};

export const calculateAtkTaiBuk = (player) => {
  if (!player) return 5;
  // Taijutsu e Bukijutsu são a fonte primária de dano
  const base = ((player.forca || 0) * 1) + ((player.taijutsu || 0) * 2) + ((player.bukijutsu || 0) * 2) + 5;
  return base + getEquipmentBonus(player, 'tai') + getEquipmentBonus(player, 'buk');
};

export const calculateAtkNinGen = (player) => {
  if (!player) return 5;
  // Ninjutsu e Genjutsu são a fonte primária de dano
  const base = ((player.inteligencia || 0) * 1) + ((player.ninjutsu || 0) * 2) + ((player.genjutsu || 0) * 2) + 5;
  return base + getEquipmentBonus(player, 'nin') + getEquipmentBonus(player, 'gen');
};

export const calculateDefTaiBuk = (player) => {
  if (!player) return 0;
  const base = ((player.resistencia || 0) * 1) + Math.floor((player.taijutsu || 0) / 2);
  return base + getEquipmentBonus(player, 'def');
};

export const calculateDefNinGen = (player) => {
  if (!player) return 0;
  const base = ((player.resistencia || 0) * 1) + Math.floor((player.ninjutsu || 0) / 2);
  return base + getEquipmentBonus(player, 'def');
};

// Fórmulas Secundárias
export const calculatePerfuracao = (player) => (player.agilidade || 0) * 2;
export const calculatePrecisao = (player) => (player.selo || 0) * 2;
export const calculateConcentracao = (player) => Math.floor(((player.inteligencia || 0) + (player.genjutsu || 0)) / 2);
export const calculatePercepcao = (player) => Math.floor(((player.agilidade || 0) + (player.ninjutsu || 0)) / 2);
export const calculateConviccao = (player) => Math.floor(((player.energia || 0) + (player.forca || 0)) / 2);
export const calculateDeterminacao = (player) => Math.floor(((player.energia || 0) + (player.resistencia || 0)) / 2);

// --- VANTAGEM ELEMENTAL ---
// Suiton > Katon > Futon > Raiton > Doton > Suiton
export const getElementalMultiplier = (attackerElement, defenderElement) => {
  if (!attackerElement || !defenderElement) return 1.0;

  const a = attackerElement.toLowerCase();
  const d = defenderElement.toLowerCase();

  // Vantagens (+20%)
  if (a === 'suiton' && d === 'katon') return 1.2;
  if (a === 'katon' && d === 'futon') return 1.2;
  if (a === 'futon' && d === 'raiton') return 1.2;
  if (a === 'raiton' && d === 'doton') return 1.2;
  if (a === 'doton' && d === 'suiton') return 1.2;

  // Desvantagens (-20%)
  if (a === 'katon' && d === 'suiton') return 0.8;
  if (a === 'futon' && d === 'katon') return 0.8;
  if (a === 'raiton' && d === 'futon') return 0.8;
  if (a === 'doton' && d === 'raiton') return 0.8;
  if (a === 'suiton' && d === 'doton') return 0.8;

  return 1.0;
};

// --- REGRAS DE PAREAMENTO PVP (ROUND CAOS) ---
export const getPvPMatchRules = (playerRank, playerLevel) => {
  const lvl = Number(playerLevel) || 1;
  const rank = playerRank || 'Genin';

  if (rank === 'Genin' || rank === 'Estudante da Academia') {
    if (lvl <= 14) return { minLvl: Math.max(1, lvl - 3), maxLvl: lvl + 3, targetRanks: ['Estudante da Academia', 'Genin'] };
    // Level 15 (Borda)
    return { minLvl: lvl, maxLvl: lvl, targetRanks: ['Genin'] };
  }

  if (rank === 'Chunin') {
    if (lvl <= 24) return { minLvl: Math.max(15, lvl - 5), maxLvl: lvl + 5, targetRanks: ['Chunin'] };
    // Level 25 (Borda)
    return { minLvl: lvl, maxLvl: lvl, targetRanks: ['Chunin'] };
  }

  if (rank === 'Jounin') {
    if (lvl <= 35) return { minLvl: 25, maxLvl: 35, targetRanks: ['Jounin'] };
    // Level 36+ (Estagnado)
    return { minLvl: 35, maxLvl: 999, targetRanks: ['ANBU'] };
  }

  if (rank === 'ANBU') {
    if (lvl <= 45) return { minLvl: 35, maxLvl: 45, targetRanks: ['ANBU'] };
    // Level 46+ (Estagnado)
    return { minLvl: 45, maxLvl: 999, targetRanks: ['Sanin'] };
  }

  if (rank === 'Sanin') {
    if (lvl <= 55) return { minLvl: 45, maxLvl: 55, targetRanks: ['Sanin'] };
    // Level 56+ (Estagnado)
    return { minLvl: 55, maxLvl: 999, targetRanks: ['Heroi'] };
  }

  if (rank === 'Heroi') {
    return { minLvl: 55, maxLvl: 999, targetRanks: ['Heroi'] };
  }

  // Fallback seguro
  return { minLvl: Math.max(1, lvl - 3), maxLvl: lvl + 3, targetRanks: null };
};

// ==========================================
// SISTEMA DE DEBUFFS GLOBAIS (World Boss)
// ==========================================
export const getGlobalDebuffs = (activeBoss) => {
  const debuffs = {
    staminaCostMultiplier: 1, // Fase 1
    accuracyPenalty: 0,       // Fase 2
    hospitalCostMultiplier: 1,// Fase 3
    ryouGainMultiplier: 1,    // Fase 4
    currentPhase: 0
  };

  if (!activeBoss || !activeBoss.is_world_boss || !activeBoss.boss_stats) return debuffs;

  const hpStr = activeBoss.boss_stats.hp;
  if (!hpStr) return debuffs;

  const hpMatch = hpStr.match(/^(\d+)\/(\d+)$/);
  if (!hpMatch) return debuffs;

  const currentHP = parseInt(hpMatch[1], 10);
  const maxHP = parseInt(hpMatch[2], 10);
  if (maxHP <= 0) return debuffs;

  const hpPercent = (currentHP / maxHP) * 100;

  // Fase 1: 100% ~ 76% (Atmosfera Pesada)
  if (hpPercent <= 100) {
    debuffs.currentPhase = 1;
    debuffs.staminaCostMultiplier = 1.30;
  }
  // Fase 2: 75% ~ 51% (Instabilidade de Chakra)
  if (hpPercent <= 75) {
    debuffs.currentPhase = 2;
    debuffs.accuracyPenalty = 15;
  }
  // Fase 3: 50% ~ 26% (Hospitais Superlotados)
  if (hpPercent <= 50) {
    debuffs.currentPhase = 3;
    debuffs.hospitalCostMultiplier = 2.0;
  }
  // Fase 4: 25% ~ 1% (Pânico Econômico)
  if (hpPercent <= 25) {
    debuffs.currentPhase = 4;
    debuffs.ryouGainMultiplier = 0.5;
  }

  return debuffs;
};

// ==========================================
// SISTEMA DE BUFFS DE EDIFÍCIOS DA VILA
// ==========================================
export const getVillageBuildingLevel = (player, buildingType) => {
  // Requer player.village_buildings carregado
  if (!player || !player.village_buildings || !Array.isArray(player.village_buildings)) return 0;
  const b = player.village_buildings.find(x => x.building_type === buildingType);
  if (!b || b.level <= 0) return 0;
  return b.level;
};

export const getHospitalDiscount = (player) => {
  const lvl = getVillageBuildingLevel(player, 'hospital');
  return Math.min(0.5, lvl * 0.10); // Máximo 50%
};

export const getDojoXPBonus = (player) => {
  const lvl = getVillageBuildingLevel(player, 'dojo');
  return 1 + (lvl * 0.05);
};

export const getBlacksmithDiscount = (player) => {
  const lvl = getVillageBuildingLevel(player, 'blacksmith');
  return Math.min(0.3, lvl * 0.05); // Máximo 30%
};

export const canAccessRankSMissions = (player) => {
  return getVillageBuildingLevel(player, 'kage') >= 2;
};

export const getGatesDefMultiplier = (player) => {
  const lvl = getVillageBuildingLevel(player, 'gates');
  return 1 + (lvl * 0.02);
};

export const getIchirakuStaminaBonus = (player) => {
  const lvl = getVillageBuildingLevel(player, 'ichiraku');
  return lvl * 50;
};
