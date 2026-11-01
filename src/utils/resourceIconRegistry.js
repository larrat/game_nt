/** One canonical set of resource illustrations, shared across every game HUD. */
export const RESOURCE_ICON_PATHS = Object.freeze({
  hp: '/images/imgi_98_heart.png',
  chakra: '/images/imgi_99_chakra.png',
  stamina: '/images/imgi_100_stamina.png',
  xp: '/images/imgi_32_star.png'
});

export function getResourceIcon(kind) {
  return RESOURCE_ICON_PATHS[kind] || null;
}
