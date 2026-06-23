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

// --- FÓRMULAS DE COMBATE (Status Baseados na Ficha) ---

export const calculateHP = (player) => {
  if (!player) return 100;
  return 100 + ((player.level || 1) * 20) + ((player.stamina_pts || 0) * 2);
};

export const calculateChakra = (player) => {
  if (!player) return 50;
  return 50 + ((player.level || 1) * 10) + ((player.stamina_pts || 0) * 1);
};

export const calculateAtkFisico = (player) => {
  if (!player) return 5;
  return Math.floor((player.tai || 0) / 2) + 5;
};

export const calculateAtkMagico = (player) => {
  if (!player) return 15;
  return Math.floor((player.nin || 0) / 2) + 15;
};

export const calculateDefesa = (player) => {
  if (!player) return 0;
  return Math.floor((player.def || 0) / 2);
};
