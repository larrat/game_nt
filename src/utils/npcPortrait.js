/**
 * Resolve retratos de NPC e chefes com prioridade para arte local reutilizável.
 *
 * Não consulta fontes externas nem publica cópias do acervo de referência.
 * Para acrescentar um personagem, crie um arquivo de uso autorizado em
 * public/images e adicione sua identidade a PORTRAIT_RULES.
 * Este arquivo trata só de apresentação, nunca de IDs/estatísticas de combate.
 */
export const PORTRAIT_RULES = Object.freeze([
  { key: 'kurama', matches: ['kurama', 'kyuubi', 'kyubi', 'raposa de nove caudas', 'raposa de 9 caudas'], src: '/images/bosses/raposa-nove-caudas.svg', source: 'original' },
  { key: 'naruto', matches: ['naruto'], src: '/images/naruto.jpg', source: 'existing-project' },
  { key: 'sasuke', matches: ['sasuke'], src: '/images/sasuke.jpg', source: 'existing-project' }
]);

export function normalizeNpcName(name) {
  return String(name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function matchesName(name, alias) {
  // Character names are tokens; "sasuke" must not match "sasukex".
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^a-z0-9])' + escaped + '($|[^a-z0-9])').test(name);
}

export function getNpcPortrait(npc) {
  if (!npc) return null;
  const name = normalizeNpcName(npc.name || npc.npc_name || npc.boss_name || npc.event_name);
  // Identidade do chefe deve prevalecer sobre avatares genéricos já existentes.
  const rule = PORTRAIT_RULES.find(item => item.matches.some(alias => matchesName(name, alias)));
  if (rule) return rule.src;

  // Não exibir URL externa ou caminho de "docs/" como se fosse imagem de jogo.
  const candidate = npc.portrait || npc.image_url || npc.npc_image_url || npc.boss_image_url || npc.avatar;
  if (typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('..')) {
    return candidate;
  }
  return null;
}

export function getNpcFallback(npc) {
  return normalizeNpcName(npc?.name || npc?.npc_name).includes('raposa') ? '🦊' : '🥷';
}
