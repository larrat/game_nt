/**
 * Proveniência de adversários. O catálogo não autoriza combate por si só:
 * a sessão e as recompensas devem ser validadas pelo servidor.
 */
export const OPPONENT_ORIGINS = Object.freeze({
  NPC: 'npc',
  CATALOG: 'catalog_character',
  PLAYER_SHADOW: 'player_shadow'
});

function safePortraitPath(value) {
  return typeof value === 'string' &&
    value.startsWith('/images/') &&
    !value.includes('..') &&
    !value.startsWith('//') ? value : null;
}

/**
 * Qualquer um dos registros do catálogo de personagens pode aparecer como
 * adversário em tela, mas ainda precisa de regras/sessão de combate próprias.
 * URLs externas do jogo de referência não são usadas como hotlink.
 */
export function createCatalogOpponent(character) {
  if (!character || typeof character.id !== 'string' || !character.id.trim() ||
      typeof character.name !== 'string' || !character.name.trim()) return null;
  return {
    id: `catalog_${encodeURIComponent(character.id)}`,
    catalog_character_id: character.id,
    name: character.name.trim(),
    avatar: safePortraitPath(character.base_avatar_url),
    opponent_origin: OPPONENT_ORIGINS.CATALOG,
    is_catalog_projection: true,
    combat_ready: false
  };
}

/**
 * Projeção de jogador para o Mapa. Aceita somente os campos retornados pelo
 * RPC listar_perfis_ninja; nunca busca inventário, build privada ou credencial.
 * Estatísticas de projeção são valores de exibição/combate legado, não a build
 * real da conta. Vitórias e recompensas seguem a validação existente.
 */
export function createPlayerShadow(publicProfile, viewerPlayerId) {
  const id = Number(publicProfile?.id);
  const level = Number(publicProfile?.level);
  const name = String(publicProfile?.name || '').trim();
  if (!Number.isSafeInteger(id) || id <= 0 || Number(viewerPlayerId) === id ||
      !name || !Number.isFinite(level) || level < 1) return null;

  const lvl = Math.min(100000, Math.floor(level));
  return {
    id: `ghost_${id}`,
    name,
    level: lvl,
    avatar: safePortraitPath(publicProfile.avatar),
    hp: Math.max(1, lvl * 50),
    chakra: Math.max(1, lvl * 50),
    atk: Math.max(1, lvl * 5),
    def: Math.max(1, lvl * 3),
    nin: Math.max(1, lvl),
    element: typeof publicProfile.element === 'string' ? publicProfile.element : 'Katon',
    rank: typeof publicProfile.rank === 'string' ? publicProfile.rank : null,
    is_ghost: true,
    opponent_origin: OPPONENT_ORIGINS.PLAYER_SHADOW,
    xpReward: Math.floor(lvl * 3),
    ryouReward: Math.floor(lvl * 2),
    x: 10 + ((id * 17) % 80),
    y: 10 + ((id * 23) % 80)
  };
}
