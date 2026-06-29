/**
 * Fórmulas Matemáticas do Motor (Engine) do Kurokage
 */

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
  return 100 + ((player.level || 1) * 20) + ((player.energia || 0) * 10);
};

export const calculateChakra = (player) => {
  if (!player) return 50;
  return 50 + ((player.level || 1) * 10) + ((player.energia || 0) * 5) + ((player.ninjutsu || 0) * 3) + ((player.genjutsu || 0) * 3);
};

export const calculateStamina = (player) => {
  if (!player) return 50;
  return 50 + ((player.level || 1) * 10) + ((player.energia || 0) * 5) + ((player.taijutsu || 0) * 3) + ((player.bukijutsu || 0) * 3);
};

export const calculateAtkTaiBuk = (player) => {
  if (!player) return 5;
  return ((player.forca || 0) * 2) + 5;
};

export const calculateAtkNinGen = (player) => {
  if (!player) return 5;
  return ((player.inteligencia || 0) * 2) + 5;
};

export const calculateDefTaiBuk = (player) => {
  if (!player) return 0;
  return ((player.resistencia || 0) * 2);
};

export const calculateDefNinGen = (player) => {
  if (!player) return 0;
  return ((player.resistencia || 0) * 2);
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
