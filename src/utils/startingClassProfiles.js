// One shared presentation contract for the ten starting attributes.
// The server function in migration 073 is authoritative for created players.
export const STARTING_ATTRIBUTE_BUDGET = 10;

export const STARTING_ATTRIBUTES = Object.freeze([
  { key: 'taijutsu', label: 'Taijutsu' },
  { key: 'bukijutsu', label: 'Bukijutsu' },
  { key: 'ninjutsu', label: 'Ninjutsu' },
  { key: 'genjutsu', label: 'Genjutsu' },
  { key: 'inteligencia', label: 'Inteligência' },
  { key: 'forca', label: 'Força' },
  { key: 'selo', label: 'Selo' },
  { key: 'agilidade', label: 'Agilidade' },
  { key: 'resistencia', label: 'Resistência' },
  { key: 'energia', label: 'Energia' }
]);

// Ten points in total for every class. Specialization affects allocation only.
export const STARTING_CLASS_PROFILES = Object.freeze([
  {
    id: 'NIN', name: 'Ninjutsu', icon: 'scroll',
    desc: 'Especialista em técnicas ninjas.',
    stats: Object.freeze({
      taijutsu: 0, bukijutsu: 0, ninjutsu: 3, genjutsu: 1,
      inteligencia: 2, forca: 0, selo: 1, agilidade: 1,
      resistencia: 1, energia: 1
    })
  },
  {
    id: 'TAI', name: 'Taijutsu', icon: 'swords',
    desc: 'Especialista em combate corpo a corpo.',
    stats: Object.freeze({
      taijutsu: 3, bukijutsu: 1, ninjutsu: 0, genjutsu: 0,
      inteligencia: 0, forca: 2, selo: 0, agilidade: 2,
      resistencia: 1, energia: 1
    })
  },
  {
    id: 'GEN', name: 'Genjutsu', icon: 'sparkles',
    desc: 'Especialista em ilusões.',
    stats: Object.freeze({
      taijutsu: 0, bukijutsu: 0, ninjutsu: 0, genjutsu: 3,
      inteligencia: 2, forca: 0, selo: 2, agilidade: 1,
      resistencia: 1, energia: 1
    })
  },
  {
    id: 'BUK', name: 'Bukijutsu', icon: 'shield',
    desc: 'Especialista em armas ninja.',
    stats: Object.freeze({
      taijutsu: 0, bukijutsu: 3, ninjutsu: 0, genjutsu: 0,
      inteligencia: 0, forca: 2, selo: 1, agilidade: 2,
      resistencia: 1, energia: 1
    })
  }
]);

export const getStartingAttributeTotal = stats =>
  STARTING_ATTRIBUTES.reduce((total, attribute) => total + (stats[attribute.key] || 0), 0);

export function getStartingClassProfile(id) {
  return STARTING_CLASS_PROFILES.find(profile => profile.id === id) || STARTING_CLASS_PROFILES[0];
}
