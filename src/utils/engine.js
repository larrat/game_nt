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


// --- BÔNUS DE GRADUAÇÃO ---
export const getRankBonus = (rankName) => {
  const bonuses = {
    "Estudante da Academia": { hp: 0, chakra: 0, stamina: 0 },
    "Genin": { hp: 150, chakra: 150, stamina: 150 },
    "Chunin": { hp: 350, chakra: 300, stamina: 300 },
    "Jounin": { hp: 600, chakra: 500, stamina: 500 },
    "ANBU": { hp: 1000, chakra: 800, stamina: 800 },
    "Sannin": { hp: 1500, chakra: 1200, stamina: 1200 },
    "Herói": { hp: 2500, chakra: 2000, stamina: 2000 }
  };
  return bonuses[rankName] || { hp: 0, chakra: 0, stamina: 0 };
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

export const CLAN_PASSIVES = {
  'Senju': { hpMult: 1.10, desc: '+10% HP Máximo' },
  'Uzumaki': { chakraMult: 1.15, hpMult: 1.05, desc: '+15% Chakra, +5% HP' },
  'Uchiha': { critChance: 0.15, desc: '+15% Crítico' },
  'Hyuga': { armorPen: 0.20, desc: '+20% Penetração de Armadura' },
  'Nara': { paralyzeChance: 0.10, desc: '+10% chance de Paralisar' },
  'Inuzuka': { atkMult: 1.10, desc: '+10% Dano Físico' },
  'Kaguya': { boneDmg: 0.15, desc: '+15% Dano Taijutsu' },
  'Aburame': { poisonChance: 0.10, desc: '+10% chance de Envenenar' },
  'Akimichi': { hpMult: 1.08, desc: '+8% HP, Resistência maior' },
  'Yamanaka': { mindControl: 0.08, desc: '+8% chance de Controle Mental' },
  'Hozuki': { chakraMult: 1.10, desc: '+10% Chakra Máximo' },
  'Yuki': { iceDmg: 0.12, desc: '+12% Dano com gelo (Suiton/Futon)' },
};

export const getClanBonus = (player) => {
  if (!player || !player.clan) return {};
  return CLAN_PASSIVES[player.clan] || {};
};

export const calculateHP = (player) => {
  if (!player) return 100;
  const rankBoost = getRankBonus(player.rank).hp;
  const base = 100 + ((player.level || 1) * 30) + ((player.resistencia || 0) * 10) + ((player.energia || 0) * 5) + rankBoost;
  const equipBonus = getEquipmentBonus(player, 'hp');
  const clanBonus = getClanBonus(player);
  const hpMult = clanBonus.hpMult || 1.0;
  return Math.floor((base + equipBonus) * hpMult);
};

export const calculateChakra = (player) => {
  if (!player) return 50;
  const rankBoost = getRankBonus(player.rank).chakra;
  const base = 100 + ((player.level || 1) * 20) + ((player.energia || 0) * 5) + ((player.ninjutsu || 0) * 5) + ((player.genjutsu || 0) * 5) + rankBoost;
  const equipBonus = getEquipmentBonus(player, 'chakra');
  const clanBonus = getClanBonus(player);
  const chakraMult = clanBonus.chakraMult || 1.0;
  return Math.floor((base + equipBonus) * chakraMult);
};

export const calculateStamina = (player) => {
  if (!player) return 50;
  const rankBoost = getRankBonus(player.rank).stamina;
  const base = 100 + ((player.level || 1) * 20) + ((player.energia || 0) * 5) + ((player.taijutsu || 0) * 5) + ((player.bukijutsu || 0) * 5) + rankBoost;
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
  // Ninjutsu e Genjutsu são a fonte primária de dano (aumentado multiplicador de inteligência)
  const base = ((player.inteligencia || 0) * 2) + ((player.ninjutsu || 0) * 2) + ((player.genjutsu || 0) * 2) + 10;
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

// Fórmulas Secundárias (Baseados nas novas regras do RPG Master)
export const calculateCritChance = (player) => Math.min(50, Math.floor((player?.agilidade || 0) / 5));
export const calculateDodgeChance = (player) => Math.min(50, Math.floor((player?.agilidade || 0) / 5));
export const calculateChakraDiscount = (player) => Math.min(50, Math.floor((player?.selo || 0) / 5));

// Atributos derivados antigos (mantidos por compatibilidade se usados em outro lugar)
export const calculatePerfuracao = (player) => (player?.agilidade || 0) * 2;
export const calculatePrecisao = (player) => (player?.selo || 0) * 2;
export const calculateConcentracao = (player) => Math.floor(((player?.inteligencia || 0) + (player?.genjutsu || 0)) / 2);
export const calculatePercepcao = (player) => Math.floor(((player?.agilidade || 0) + (player?.ninjutsu || 0)) / 2);
export const calculateConviccao = (player) => Math.floor(((player?.energia || 0) + (player?.forca || 0)) / 2);
export const calculateDeterminacao = (player) => Math.floor(((player?.energia || 0) + (player?.resistencia || 0)) / 2);

// --- VANTAGEM ELEMENTAL ---
// Suiton > Katon > Futon > Raiton > Doton > Suiton
export const getElementalMultiplier = (attackerElement, defenderElement) => {
  if (!attackerElement || !defenderElement) return 1.0;

  const a = attackerElement.toLowerCase();
  const d = defenderElement.toLowerCase();

  // Vantagens Elementais Mágicas (+20%)
  if (a === 'suiton' && d === 'katon') return 1.2;
  if (a === 'katon' && d === 'futon') return 1.2;
  if (a === 'futon' && d === 'raiton') return 1.2;
  if (a === 'raiton' && d === 'doton') return 1.2;
  if (a === 'doton' && d === 'suiton') return 1.2;

  // Desvantagens Elementais Mágicas (-20%)
  if (a === 'katon' && d === 'suiton') return 0.8;
  if (a === 'futon' && d === 'katon') return 0.8;
  if (a === 'raiton' && d === 'futon') return 0.8;
  if (a === 'doton' && d === 'raiton') return 0.8;
  if (a === 'suiton' && d === 'doton') return 0.8;

  // Vantagens Marciais Físicas (+20%)
  // Jūken (Punho Suave) quebra Gōken (Punho Forte)
  if (a === 'juken' && d === 'goken') return 1.2;
  // Kenjutsu (Armas) quebra Jūken (Punho Suave)
  if (a === 'kenjutsu' && d === 'juken') return 1.2;
  // Gōken (Punho Forte) quebra Kenjutsu (Armas)
  if (a === 'goken' && d === 'kenjutsu') return 1.2;

  // Desvantagens Marciais Físicas (-20%)
  if (a === 'goken' && d === 'juken') return 0.8;
  if (a === 'juken' && d === 'kenjutsu') return 0.8;
  if (a === 'kenjutsu' && d === 'goken') return 0.8;

  // Mágico vs Físico ou Empate = Neutro
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

  if (!activeBoss || !activeBoss.is_world_boss) return debuffs;

  const currentHP = Number(activeBoss.boss_hp);
  const maxHP = Number(activeBoss.boss_max_hp);
  
  if (isNaN(currentHP) || isNaN(maxHP) || maxHP <= 0) return debuffs;

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

// --- APRIMORAMENTO DE JUTSUS (ESSÊNCIAS) ---
export const getJutsuEnhancementBonus = (jutsu, statName) => {
  if (!jutsu) return 0;
  let total = 0;
  
  // 1. Lendo os atributos já absorvidos de níveis anteriores
  if (jutsu.absorbed_stats && jutsu.absorbed_stats[statName]) {
    total += jutsu.absorbed_stats[statName];
  }

  // 2. Lendo os slots atuais equipados
  if (jutsu.slots && Array.isArray(jutsu.slots)) {
    jutsu.slots.forEach(slot => {
      if (!slot) return;
      const [type, tierStr] = slot.split('_');
      if (type === statName) {
        const tier = parseInt(tierStr) || 1;
        if (statName === 'dano') total += (tier === 1 ? 5 : tier === 2 ? 15 : tier === 3 ? 30 : tier === 4 ? 50 : 100);
        if (statName === 'custo') total += (tier === 1 ? -2 : tier === 2 ? -5 : tier === 3 ? -10 : tier === 4 ? -15 : -25);
        if (statName === 'letalidade') total += (tier === 1 ? 2 : tier === 2 ? 5 : tier === 3 ? 10 : tier === 4 ? 15 : 25);
        if (statName === 'protecao') total += (tier === 1 ? 10 : tier === 2 ? 25 : tier === 3 ? 50 : tier === 4 ? 100 : 200);
      }
    });
  }

  // HARD CAPS PARA BALANCEAMENTO (Aplicado após a soma)
  if (statName === 'custo') {
    // Redução máxima de custo é de -50 para evitar que o custo fique negativo ou muito baixo, 
    // mas o limite final será no Combate.jsx (onde o custo não pode ser < 1)
  }
  if (statName === 'letalidade') {
    total = Math.min(total, 50); // Máximo 50% de chance extra
  }

  return total;
};

// --- GERAÇÃO DE PVE E ESCALONAMENTO DE NPCs ---

export const getDynamicNpcJutsus = (npc) => {
  if (!npc.element) return [];
  
  const jutsus = [];
  
  // Jutsu Básico (Genin+)
  jutsus.push({
    name: `Liberação de ${npc.element}: Jutsu Básico`,
    element: npc.element,
    damage: Math.floor((npc.level || 1) * 1.5) + 15,
    chakraCost: 20,
    accuracy: 90,
    category: 'ninjutsu'
  });

  // Jutsu Intermediário (Chunin+)
  if (npc.level >= 11) {
    jutsus.push({
      name: `Liberação de ${npc.element}: Jutsu Avançado`,
      element: npc.element,
      damage: Math.floor((npc.level || 1) * 2.5) + 35,
      chakraCost: 45,
      accuracy: 85,
      category: 'ninjutsu'
    });
  }

  // Jutsu Supremo (Jounin+)
  if (npc.level >= 21) {
    jutsus.push({
      name: `Liberação de ${npc.element}: Jutsu Supremo`,
      element: npc.element,
      damage: Math.floor((npc.level || 1) * 4.0) + 70,
      chakraCost: 80,
      accuracy: 80,
      category: 'ninjutsu'
    });
  }

  return jutsus;
};

export const generateDynamicRogueNinja = (player, extraLevelBonus = 0) => {
  const levelDiff = Math.floor(Math.random() * 3) - 1; // -1 a +1
  const npcLevel = Math.max(1, player.level + levelDiff + extraLevelBonus);
  
  // Definição de Rank baseada no Level
  let rank = 'Genin';
  if (npcLevel >= 25) rank = 'Jounin';
  else if (npcLevel >= 15) rank = 'Chunin';

  const elements = ["Katon", "Futon", "Suiton", "Doton", "Raiton"];
  const element = elements[Math.floor(Math.random() * elements.length)];
  
  const clans = ["Uchiha", "Senju", "Hyuga", "Uzumaki", "Inuzuka", "Aburame", "Akimichi", "Nara", "Yamanaka", "Hozuki", "Kaguya", "Yuki"];
  const clan = clans[Math.floor(Math.random() * clans.length)];
  const titles = rank === 'Jounin' ? ["Líder Sanguinário", "Mestre das Sombras", "Kage Renegado"] 
               : rank === 'Chunin' ? ["Assassino", "Mercenário Oculto", "Batedor"] 
               : ["Renegado", "Desgarrado", "Ladrão"];
  const title = titles[Math.floor(Math.random() * titles.length)];
  
  const avatars = rank === 'Jounin' ? ["👹", "👺", "💀"] : rank === 'Chunin' ? ["🥷", "👻", "🗡️"] : ["👤", "👺", "🥷"];

  const attributesList = ["forca", "agilidade", "resistencia", "inteligencia", "energia", "ninjutsu", "taijutsu", "genjutsu", "bukijutsu", "selo"];
  
  // Calcula o total de pontos que o jogador tem
  let totalStats = attributesList.reduce((acc, stat) => acc + (player[stat] || 5), 0);
  
  // Bônus adicional pelas zonas de risco (extraLevelBonus)
  // Cada nível a mais concede +5 atributos. Inimigos Jounin também ganham bônus maciço extra.
  totalStats += (extraLevelBonus * 5);
  if (rank === 'Chunin') totalStats += 20;
  if (rank === 'Jounin') totalStats += 50;
  
  const npcStats = {
     forca: 5, agilidade: 5, resistencia: 5, inteligencia: 5, energia: 5,
     ninjutsu: 5, taijutsu: 5, genjutsu: 5, bukijutsu: 5, selo: 5
  };
  
  let statsToDistribute = Math.max(0, totalStats - 50); // subtract the base 5 per stat
  while (statsToDistribute > 0) {
     const randomAttr = attributesList[Math.floor(Math.random() * attributesList.length)];
     npcStats[randomAttr]++;
     statsToDistribute--;
  }
  
  // Opcional: Invocação se for Chunin+
  let npcSummon = null;
  if (rank === 'Chunin' || rank === 'Jounin') {
    const summonTypes = ["Sapo", "Cobra", "Lesma", "Cão", "Pássaro", "Tartaruga", "Macaco"];
    npcSummon = {
      name: `Invocação: ${summonTypes[Math.floor(Math.random() * summonTypes.length)]}`,
      animal_type: 'Summon',
      base_atk: rank === 'Jounin' ? 100 : 50,
      base_def: rank === 'Jounin' ? 100 : 50
    };
  }

  const npc = {
    id: `rogue_${Date.now()}`,
    name: `${clan} ${title} (${rank})`,
    avatar: avatars[Math.floor(Math.random() * avatars.length)],
    level: npcLevel,
    rank: rank,
    element: element,
    clan: clan,
    clan_bonus: { name: clan, critChance: clan === 'Uchiha' ? 0.15 : 0, armorPen: clan === 'Hyuga' ? 0.2 : 0, paralyzeChance: clan === 'Nara' ? 0.1 : 0 },
    xpReward: Math.floor((npcLevel * 50) + 100),
    ryouReward: Math.floor((npcLevel * 25) + 50),
    desc: rank === 'Jounin' ? `Um inimigo formidável apareceu! Prepare-se para a morte.` : extraLevelBonus > 0 ? `Você andou longe demais... Um ninja perigoso sentiu sua presença!` : `Você encontrou um ninja renegado pelo caminho!`,
    summon: npcSummon,
    ...npcStats
  };
  
  npc.hp = calculateHP(npc);
  npc.chakra = calculateChakra(npc);
  npc.activeJutsus = getDynamicNpcJutsus(npc);
  
  return npc;
};

export const scaleStoryNPC = (npc, player) => {
  if (!npc || !player) return npc;
  
  // O level do NPC original serve como "multiplicador de dificuldade/rank"
  // Ex: Um boss level 10 original deve ser mais difícil que um level 5.
  // Escala dinâmica: NPC Level = Player Level + (Original Level / 5)
  const diffScale = Math.floor((npc.level || 1) / 5);
  const newLevel = Math.max(npc.level || 1, player.level + diffScale);
  
  const scaledNPC = { ...npc, level: newLevel };
  
  // Se o NPC não tem status separados (apenas atk e def clássicos)
  // Escalamos o atk, def e hp de forma bruta baseada no novo level.
  if (!scaledNPC.ninjutsu && !scaledNPC.taijutsu) {
    // Multiplicador com base no level escalado comparado ao player
    const scaleRatio = newLevel / Math.max(1, player.level);
    
    // Tentamos usar o atk/def base do banco (ou fallback)
    const baseAtk = scaledNPC.atk || 15;
    const baseDef = scaledNPC.def || 10;
    
    // Suavizamos o multiplicador para levels baixos
    const earlyGameNerf = player.level < 15 ? 0.7 : 1.0;
    scaledNPC.atk = Math.floor((baseAtk * scaleRatio * earlyGameNerf) + (newLevel * 4));
    scaledNPC.def = Math.floor((baseDef * scaleRatio * earlyGameNerf) + (newLevel * 2));
    scaledNPC.hp = Math.floor(((scaledNPC.hp || 100) + (newLevel * 50)) * earlyGameNerf);
    scaledNPC.chakra = Math.floor(((scaledNPC.chakra || 50) + (newLevel * 25)) * earlyGameNerf);
  }
  
  // Atualiza as recompensas dinamicamente também
  scaledNPC.xpReward = Math.floor((newLevel * 60) + 200);
  scaledNPC.ryouReward = Math.floor((newLevel * 30) + 100);
  
  // Se não tiver jutsus, adiciona o dinâmico
  if (!scaledNPC.activeJutsus || scaledNPC.activeJutsus.length === 0) {
    scaledNPC.activeJutsus = getDynamicNpcJutsus(scaledNPC);
  }
  
  return scaledNPC;
};
