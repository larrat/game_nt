// Pure catalog rules for the creation UI. The authenticated Supabase RPC
// remains authoritative for ownership, class, village and starting variants.
export const CHARACTER_CATALOG_PAGE_SIZE = 18;

export const normalizeCharacterSearch = value =>
  String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

export function filterCharacterCatalog(characters, query) {
  const term = normalizeCharacterSearch(query);
  if (!term) return characters;
  return characters.filter(character => normalizeCharacterSearch(character.name).includes(term));
}

export function paginateCharacterCatalog(characters, page, pageSize = CHARACTER_CATALOG_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(characters.length / pageSize));
  const safePage = Math.max(0, Math.min(totalPages - 1, Number.isInteger(page) ? page : 0));
  return { totalPages, page: safePage, items: characters.slice(safePage * pageSize, (safePage + 1) * pageSize) };
}

export function isStartingAvatar(avatars, characterId, avatarId) {
  return avatars.some(avatar => avatar.id === avatarId &&
    avatar.character_id === characterId && avatar.is_base === true);
}

export function chooseStartingAvatar(avatars, character) {
  if (!character) return '';
  const candidates = avatars.filter(avatar =>
    avatar.character_id === character.id && avatar.is_base === true);
  return candidates.find(avatar => avatar.id === character.base_avatar_url)?.id ||
    candidates[0]?.id || '';
}
