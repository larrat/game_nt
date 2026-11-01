/**
 * Resolve retratos de NPC e chefes com prioridade para arte local reutilizável.
 *
 * Não consulta fontes externas nem publica cópias do acervo de referência.
 * Para acrescentar um personagem, crie um arquivo de uso autorizado em
 * public/images e adicione sua identidade a PORTRAIT_RULES.
 * Este arquivo trata só de apresentação, nunca de IDs/estatísticas de combate.
 */
export const PORTRAIT_RULES = Object.freeze([
  { key: 'kurama', matches: ['kurama', 'kyuubi', 'kyubi', 'raposa de nove caudas', 'raposa de 9 caudas', 'furia da raposa'], src: '/images/bosses/raposa-nove-caudas.svg', source: 'original' },
  { key: 'naruto', matches: ['naruto'], src: '/images/naruto.jpg', source: 'existing-project' },
  { key: 'sasuke', matches: ['sasuke'], src: '/images/sasuke.jpg', source: 'existing-project' },
  { key: 'sakura', matches: ['sakura'], src: '/images/sakura.jpg', source: 'existing-project' },
  { key: 'kakashi', matches: ['kakashi'], src: '/images/kakashi.jpg', source: 'existing-project' },
  // Personagens genéricos: não inventar identidade para NPCs nomeados sem arte.
  { key: 'bandido-deserto', matches: ['bandido do deserto'], src: '/images/chars/char_rogue_ninja_1782968348009.jpg', source: 'generic-project' },
  { key: 'mercenario-nevoa', matches: ['mercenario da nevoa'], src: '/images/chars/char_elite_kage_1782968356836.jpg', source: 'generic-project' },
  { key: 'ladrao-pergaminhos', matches: ['ladrao de pergaminhos'], src: '/images/chars/char_rogue_ninja_1782968348009.jpg', source: 'generic-project' }
]);

export function normalizeNpcName(name) {
  return String(name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function matchesName(name, alias) {
  // Character names are tokens; "sasuke" must not match "sasukex".
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^a-z0-9])' + escaped + '($|[^a-z0-9])').test(name);
}

/** Variantes locais verificadas; a base neutra continua para nomes sem especialização. */
export const PORTRAIT_VARIANTS = Object.freeze([
  { key: 'sasuke-susanoo', cues: ['susanoo'], src: '/images/avatares/sasuke_23_susanoo.png' },
  { key: 'sasuke-hebi', cues: ['hebi'], src: '/images/avatares/sasuke_19_hebi.png' },
  { key: 'sasuke-chidori', cues: ['chidori'], src: '/images/avatares/sasuke_08_chidori.png' },
  { key: 'sasuke-adulto', cues: ['adulto', 'adult'], src: '/images/avatares/sasuke_27_adulto_full.png' },
  { key: 'sasuke-sharingan', cues: ['sharingan'], src: '/images/avatares/sasuke_07_sharingan.png' }
]);

const GENERIC_ROGUE_PORTRAITS = Object.freeze({
  default: '/images/chars/char_rogue_ninja_1782968348009.jpg',
  elite: '/images/chars/char_elite_kage_1782968356836.jpg'
});

export function getNpcPortrait(npc) {
  if (!npc) return null;
  const name = normalizeNpcName(npc.name || npc.npc_name || npc.boss_name || npc.event_name);
  // Um jogador pode ter o mesmo nome de um herói do catálogo. Sua projeção
  // deve usar apenas o retrato público autorizado, nunca a arte do herói.
  if (npc.is_ghost === true || npc.opponent_origin === 'player_shadow') {
    const ownPortrait = npc.portrait || npc.avatar;
    return typeof ownPortrait === 'string' &&
      ownPortrait.startsWith('/images/') &&
      !ownPortrait.startsWith('//') &&
      !ownPortrait.includes('..') ? ownPortrait : null;
  }
  // Variantes somente quando o nome identifica Sasuke e a forma correspondente.
  if (matchesName(name, 'sasuke')) {
    const variant = PORTRAIT_VARIANTS.find(item => item.cues.some(cue => matchesName(name, cue)));
    if (variant) return variant.src;
  }
  // Identidade do chefe deve prevalecer sobre avatares genéricos já existentes.
  const rule = PORTRAIT_RULES.find(item => item.matches.some(alias => matchesName(name, alias)));
  if (rule) return rule.src;

  // Não exibir URL externa ou caminho de "docs/" como se fosse imagem de jogo.
  const candidates = [npc.portrait, npc.image_url, npc.npc_image_url, npc.boss_image_url, npc.avatar];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('..')) {
      return candidate;
    }
  }
  // Artes genéricas para NPCs dinâmicos; nunca tratar um jogador fantasma como NPC.
  const dynamicRogue = npc.is_generated_rogue === true ||
    (typeof npc.id === 'string' && /^rogue_/.test(npc.id));
  if (dynamicRogue && npc.is_ghost !== true) {
    return ['Jounin', 'ANBU', 'Sannin', 'Kage'].includes(npc.rank)
      ? GENERIC_ROGUE_PORTRAITS.elite
      : GENERIC_ROGUE_PORTRAITS.default;
  }
  return null;
}

export function getNpcFallback(npc) {
  return normalizeNpcName(npc?.name || npc?.npc_name).includes('raposa') ? '🦊' : '🥷';
}
