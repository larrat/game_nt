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
