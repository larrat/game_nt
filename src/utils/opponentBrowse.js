import { createCatalogOpponent, createPlayerShadow, OPPONENT_ORIGINS } from './opponentRoster.js';

export const OPPONENT_TABS = Object.freeze([
  { key: 'catalog', label: 'Personagens', description: 'Personagens do universo ninja' },
  { key: 'npc', label: 'NPCs', description: 'Inimigos e instrutores cadastrados' },
  { key: 'players', label: 'Jogadores', description: 'Projeções de perfis públicos' }
]);

const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function toOpponentRows(tab, rows, viewerId) {
  const list = Array.isArray(rows) ? rows : [];
  if (tab === 'catalog') return list.map(createCatalogOpponent).filter(Boolean);
  if (tab === 'players') return list.map(item => createPlayerShadow(item, viewerId)).filter(Boolean);
  if (tab === 'npc') {
    return list.filter(item => item && item.is_active === true && Number.isInteger(Number(item.id)))
      .map(item => ({
        id: item.id,
        name: String(item.name || 'NPC').trim(),
        avatar: item.avatar,
        level: item.level,
        rank: item.rank,
        is_map_npc: item.is_map_npc,
        opponent_origin: OPPONENT_ORIGINS.NPC,
        combat_ready: false // O catálogo visual não cria sessões de combate.
      }));
  }
  return [];
}

export function filterOpponentRows(rows, query) {
  const term = normalize(query);
  if (!term) return rows;
  return rows.filter(row => normalize(row?.name).includes(term) ||
    normalize(row?.rank).includes(term) ||
    normalize(row?.element).includes(term));
}

export function opponentStatus(tab, npc) {
  if (tab === 'catalog') return 'Combate em preparação';
  if (tab === 'players') return 'Projeção pública';
  return npc?.is_map_npc ? 'Encontrável no mapa' : 'NPC do Dojo ou história';
}
