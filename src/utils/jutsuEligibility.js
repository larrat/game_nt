// Descreve os requisitos já aplicados pela RPC aprender_jutsu.
// Não introduz multiplicadores de classe: o catálogo atual não os define.
export const toJutsuId = (value) => String(value?.id ?? value ?? '');

const equalServerText = (a, b) =>
  String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();

const isUnrestricted = (value) => {
  const text = String(value ?? '').trim().toLowerCase();
  return !text || ['todos', 'qualquer', 'all'].includes(text);
};

const rankOrder = ['estudante da academia', 'genin', 'chunin', 'jonin', 'anbu', 'sannin', 'heroi'];
const rankAliases = {
  estudante: 'estudante da academia',
  jounin: 'jonin',
  'sannin lendário': 'sannin',
  'sannin lendario': 'sannin',
  'herói': 'heroi',
  'herói mundial': 'heroi',
  'heroi mundial': 'heroi'
};

export const getJutsuRankIndex = (name) => {
  const key = String(name ?? '').trim().toLowerCase();
  if (!key) return 0;
  return rankOrder.indexOf(rankAliases[key] || key);
};

const requiredNumber = (value) => Math.max(0, Number(value) || 0);

export const getJutsuMasteryStat = (category) => {
  switch (String(category ?? '').toLowerCase()) {
    case 'taijutsu': return 'taijutsu';
    case 'bukijutsu': return 'bukijutsu';
    case 'genjutsu': return 'genjutsu';
    default: return 'ninjutsu'; // Espelha o ELSE do RPC, incluindo Fuinjutsu.
  }
};

export const getJutsuEligibility = (jutsu, player, isLearned = false) => {
  if (!jutsu || !player) return { eligible: false, reasons: ['Personagem indisponível'], requirements: [], cost: 0 };
  const requirements = [];
  const add = (key, label, met) => requirements.push({ key, label, met: !!met });
  const level = requiredNumber(jutsu.req_level ?? jutsu.lvl ?? 1);
  const rank = jutsu.req_rank ?? jutsu.reqRank;
  const rankReq = getJutsuRankIndex(rank);
  const playerRank = getJutsuRankIndex(player.rank);
  add('level', `Nível ${level || 1}`, requiredNumber(player.level) >= (level || 1));
  if (!isUnrestricted(rank)) {
    add('rank', `Graduação ${rank}`, rankReq >= 0 && playerRank >= rankReq);
  }

  const attr = getJutsuMasteryStat(jutsu.category);
  const masteryRequired = requiredNumber(jutsu.req_attr_value ?? jutsu.reqAttrValue);
  if (masteryRequired > 0) {
    add('mastery', `${masteryRequired} em ${attr}`, requiredNumber(player[attr]) >= masteryRequired);
  }
  const sealRequired = requiredNumber(jutsu.req_seals);
  if (sealRequired > 0) add('seals', `${sealRequired} em selo`, requiredNumber(player.selo) >= sealRequired);

  const reqClass = jutsu.req_class ?? jutsu.reqClass;
  if (!isUnrestricted(reqClass)) add('class', `Classe ${reqClass}`, equalServerText(reqClass, player.class));
  if (!isUnrestricted(jutsu.req_clan)) add('clan', `Clã ${jutsu.req_clan}`, equalServerText(jutsu.req_clan, player.clan));
  if (!isUnrestricted(jutsu.element)) add('element', `Elemento ${jutsu.element}`, equalServerText(jutsu.element, player.element));

  const cost = requiredNumber(jutsu.cost_ryous ?? jutsu.cost);
  add('ryous', `RY$ ${cost.toLocaleString('pt-BR')}`, requiredNumber(player.ryous) >= cost);
  const reasons = requirements.filter((req) => !req.met).map((req) => req.label);
  if (isLearned) reasons.unshift('Jutsu já aprendido');
  return { eligible: !isLearned && reasons.length === 0, reasons, requirements, cost };
};

export const jutsuCatalogTabs = (allJutsus) => {
  const categories = [...new Set((allJutsus || []).map(j => j.category).filter(Boolean))];
  return ['Todos', ...categories, ...((allJutsus || []).some(j => !!j.element) ? ['Elementares'] : [])];
};

export const filterJutsuCatalog = (allJutsus, tab) => {
  if (tab === 'Todos') return allJutsus || [];
  if (tab === 'Elementares') return (allJutsus || []).filter(j => !!j.element);
  return (allJutsus || []).filter(j => j.category === tab);
};

export const selectBulkJutsus = (allJutsus, player, learnedIds, limit = 50) => {
  const learned = new Set([...learnedIds].map(toJutsuId));
  const eligible = (allJutsus || []).filter(j =>
    !learned.has(toJutsuId(j.id)) && getJutsuEligibility(j, player).eligible);
  const selected = eligible.slice(0, Math.max(0, limit));
  const totalCost = selected.reduce((sum, j) => sum + getJutsuEligibility(j, player).cost, 0);
  return { selected, totalCost, remaining: eligible.length - selected.length };
};
