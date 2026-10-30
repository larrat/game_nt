// Shared, testable presentation rules. Rewards and promotion eligibility remain server-authoritative.
export const MISSION_TABS = Object.freeze([
  { id: 'tarefa_academia', label: 'Academia', minLevel: 1 },
  { id: 'D', label: 'Rank D', minLevel: 1 },
  { id: 'C', label: 'Rank C', minLevel: 15 },
  { id: 'B', label: 'Rank B', minLevel: 25 },
  { id: 'A', label: 'Rank A', minLevel: 35 },
  { id: 'S', label: 'Rank S', minLevel: 45 }
]);

const RANK_ALIASES = {
  'estudante da academia': 'estudante',
  'jounin': 'jonin',
  'sannin lendario': 'sannin',
  'heroi mundial': 'heroi'
};

export const normalizeRankName = (value) => {
  const name = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return RANK_ALIASES[name] || name;
};

export const findRankIndex = (ranks, playerRank) => {
  const current = normalizeRankName(playerRank);
  if (!current || !Array.isArray(ranks)) return -1;
  return ranks.findIndex((rank) => (
    [rank?.id, rank?.nameId, rank?.title].some((value) => normalizeRankName(value) === current)
  ));
};

export const getMissionBlockReason = (task, playerLevel, activeCount, slots) => {
  if (Number(playerLevel) < Number(task.reqLevel || 1)) return `Nv.${task.reqLevel}`;
  const tab = MISSION_TABS.find((entry) => entry.id === task.type);
  if (tab && Number(playerLevel) < tab.minLevel) return `Nv.${tab.minLevel} (${tab.label})`;
  if (Number(activeCount) >= Math.max(1, Number(slots) || 1)) return 'Sem slots';
  return null;
};

const validAmount = (amount) =>
  typeof amount === 'number' && Number.isFinite(amount) && amount >= 0;

export const formatMissionCompletionMessage = (response, previousRank) => {
  const xp = response?.xp_gained;
  const ryous = response?.ryous_gained;
  let message = validAmount(xp) && validAmount(ryous)
    ? `Missão concluída! +${xp.toLocaleString('pt-BR')} XP e RY$ ${ryous.toLocaleString('pt-BR')}.`
    : 'Missão concluída! Confira seu saldo e experiência atualizados.';
  if (Number(response?.levels_gained) > 0) {
    message += ` Você avançou ${response.levels_gained} nível(is)!`;
  }
  if (response?.new_rank && normalizeRankName(response.new_rank) !== normalizeRankName(previousRank)) {
    message += ` Nova graduação: ${response.new_rank}!`;
  }
  return message;
};
