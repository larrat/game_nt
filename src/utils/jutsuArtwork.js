/**
 * Approved-by-name art linkage for existing gameplay jutsus.
 * The collected Naruto Game catalog uses a different ID namespace, therefore
 * match on confirmed same-clan technique identity only, never on external IDs.
 */
const CONFIRMED_CLAN_ART = Object.freeze({
  'uchiha::amaterasu': '/images/jutsu-art/amaterasu.jpg',
  'nara::kage nui (costura das sombras)': '/images/jutsu-art/kage-nui.jpg',
  'hyuuga::oito trigramas: 64 golpes': '/images/jutsu-art/hakke-64.jpg',
  'hyuuga::oito trigramas: leoes gemeos': '/images/jutsu-art/juuho-soushiken.jpg'
});

export function normalizeJutsuArtworkName(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

export function getJutsuArtworkUrl(jutsu) {
  if (!jutsu) return null;
  const clan = normalizeJutsuArtworkName(jutsu.req_clan);
  const clanKey = clan === 'hyuga' ? 'hyuuga' : clan;
  const name = normalizeJutsuArtworkName(jutsu.name);
  const confirmed = CONFIRMED_CLAN_ART[clanKey + '::' + name];
  if (confirmed) return confirmed;
  // Preserve existing project-provided local artwork, but never hotlink a
  // third-party URL or reinterpret a catalog reference as a gameplay ID.
  const proposed = jutsu.icon_url || jutsu.image_url;
  return typeof proposed === 'string' &&
    /^\/images\/jutsu-art\/[a-z0-9_-]+\.(png|jpe?g|webp|svg)$/i.test(proposed)
    ? proposed : null;
}

export { CONFIRMED_CLAN_ART };
