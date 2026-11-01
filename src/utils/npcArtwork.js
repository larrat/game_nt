/**
 * Registro de artes de apresentação. Não altera identidades, níveis ou dados de combate.
 * Imagens de referência: uso provisório e sujeito à revisão de direitos (issue #70).
 * Somente caminhos locais existentes em public/images devem ser publicados.
 */
const PORTRAITS = Object.freeze([
  { name: /(?:^|\s)naruto(?:\s|$)/, src: '/images/naruto.jpg' },
  { name: /(?:^|\s)sasuke(?:\s|$)/, src: '/images/sasuke.jpg' },
  { name: /(?:^|\s)sakura(?:\s|$)/, src: '/images/sakura.jpg' },
  { name: /(?:^|\s)kakashi(?:\s|$)/, src: '/images/kakashi.jpg' }
]);

const GENERIC_IMAGES = new Set(['/images/bg_forest.jpg', '/images/bg_default.jpg', '/images/bg_dojo.jpg']);

export function normalizedCharacterName(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function localArtworkPath(value) {
  if (typeof value !== 'string') return null;
  // Never interpret arbitrary URLs or traversal as a local Vite asset.
  return /^\/images\/[a-z0-9_./%\-]+\.(?:png|jpe?g|webp|avif|svg)$/i.test(value) && !value.includes('..')
    ? value : null;
}

export function resolveNpcArtwork(npc) {
  const name = normalizedCharacterName(npc?.name);
  const curated = PORTRAITS.find(entry => entry.name.test(name))?.src || null;
  const direct = localArtworkPath(npc?.avatar) || localArtworkPath(npc?.image_url);
  if (direct && !GENERIC_IMAGES.has(direct)) return direct;
  return curated || direct || null;
}

export function resolveWorldBossArtwork(event) {
  // The boss must never inherit a forest background as its portrait.
  const sources = [event?.boss_image, event?.image_url, event?.artwork, event?.avatar];
  return sources.map(localArtworkPath).find(path => path && !GENERIC_IMAGES.has(path)) || null;
}
