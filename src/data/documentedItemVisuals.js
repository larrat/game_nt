/**
 * Curated visual names from a documented public Ninja Shop observation.
 * SOURCE: docs/reverse-engineering/coleta-2026-10-30/naruto-capturas/ninja_shop.txt
 * Reference-only names are NOT production item IDs, availability, rewards,
 * abilities, prices or purchase authority. No third-party media is embedded.
 * Images become eligible only after provenance/licensing is verified.
 */
export const DOCUMENTED_ITEM_VISUALS = Object.freeze([
  [
    "Shuriken",
    "target"
  ],
  [
    "Kunai",
    "target"
  ],
  [
    "Makibishi",
    "package"
  ],
  [
    "Senbons",
    "target"
  ],
  [
    "Tarja Explosiva",
    "flame"
  ],
  [
    "Shuriken com Linha",
    "target"
  ],
  [
    "Shuriken Gigante",
    "target"
  ],
  [
    "Bomba de Luz",
    "flame"
  ],
  [
    "Sensei Shuriken",
    "target"
  ],
  [
    "Sensei Shuriken com Linha",
    "target"
  ],
  [
    "Sensei Senbons",
    "target"
  ],
  [
    "Sensei Shuriken Gigante",
    "target"
  ],
  [
    "Sensei Makibishi",
    "package"
  ],
  [
    "Sensei Kunai",
    "target"
  ],
  [
    "Etiqueta de Selamento",
    "scroll"
  ],
  [
    "Bomba de Fumaça",
    "flame"
  ],
  [
    "Etiqueta Perfurante",
    "scroll"
  ],
  [
    "Nunchaku",
    "swords"
  ],
  [
    "Tantou",
    "swords"
  ],
  [
    "Ninjaken",
    "swords"
  ],
  [
    "Tonfa de Madeira",
    "swords"
  ],
  [
    "Aian Nakkuru",
    "swords"
  ],
  [
    "Bastão",
    "swords"
  ],
  [
    "Leque",
    "shield"
  ],
  [
    "Fuuma Shuriken",
    "target"
  ],
  [
    "Espada de Kusanagi",
    "swords"
  ],
  [
    "Kunai de 3 Pontas",
    "target"
  ],
  [
    "Kunai Curvada",
    "target"
  ],
  [
    "Foice Jashin",
    "swords"
  ],
  [
    "Ken no Hachi",
    "swords"
  ],
  [
    "Raijin no Ken",
    "swords"
  ],
  [
    "Pincel",
    "sparkles"
  ],
  [
    "Senbon Guizo",
    "target"
  ],
  [
    "Mateki",
    "sparkles"
  ],
  [
    "Espada de Garian",
    "swords"
  ],
  [
    "Totsuka Yata",
    "package"
  ],
  [
    "Nunchaku Energizado",
    "swords"
  ],
  [
    "Kunai Curvada Gigante",
    "target"
  ],
  [
    "Fuuma Shuriken Dupla",
    "target"
  ],
  [
    "Kunai de Teletransporte",
    "target"
  ],
  [
    "Tonfa de Ferro",
    "swords"
  ],
  [
    "Bastão do Rei Macaco",
    "swords"
  ],
  [
    "Aian Nakkuru de Chakra",
    "swords"
  ],
  [
    "Foice Jashin Tripla",
    "swords"
  ],
  [
    "Ken no Hachi do Trovão",
    "swords"
  ],
  [
    "Pincel Gigante",
    "sparkles"
  ],
  [
    "Mateki San",
    "sparkles"
  ],
  [
    "Senbons Guizo Múltiplos",
    "target"
  ],
  [
    "Tantou de Chakra Branco",
    "swords"
  ],
  [
    "Dragão de Garian",
    "package"
  ],
  [
    "Ninjaken Dupla do Sapo",
    "swords"
  ],
  [
    "Leque Gigante",
    "shield"
  ],
  [
    "Totsuka no Tsurugi",
    "package"
  ],
  [
    "Espada do Deus Kusanagi",
    "swords"
  ],
  [
    "Raijin no Ken Amplificada",
    "swords"
  ],
  [
    "Jidanda",
    "swords"
  ],
  [
    "Jouhyou",
    "swords"
  ],
  [
    "Braço Melódico",
    "sparkles"
  ],
  [
    "Punhos Melódicos",
    "sparkles"
  ],
  [
    "Guarda-chuva Triplo",
    "shield"
  ],
  [
    "Guarda-chuva",
    "shield"
  ],
  [
    "Lançador de Injeção",
    "target"
  ],
  [
    "Lançador de Senbons",
    "target"
  ],
  [
    "Espada Cutelo Duplo",
    "swords"
  ],
  [
    "Espada Cutelo",
    "swords"
  ],
  [
    "Pergaminho de Teletransporte para Konoha",
    "scroll"
  ],
  [
    "Pergaminho de Teletransporte para Areia",
    "scroll"
  ],
  [
    "Pergaminho de Teletransporte para Névoa",
    "scroll"
  ],
  [
    "Pergaminho de Teletransporte para Pedra",
    "scroll"
  ],
  [
    "Pergaminho de Teletransporte para Nuvem",
    "scroll"
  ],
  [
    "Pergaminho de Teletransporte para Akatsuki",
    "scroll"
  ],
  [
    "Pergaminho de Teletransporte para Som",
    "scroll"
  ],
  [
    "Pergaminho de Teletransporte para Chuva",
    "scroll"
  ]
].map(([name,icon]) => Object.freeze({ name, icon, approvedImage: null })));

export const normalizeItemVisualName = value =>
  String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

const documentedByName = new Map(
  DOCUMENTED_ITEM_VISUALS.map(entry => [normalizeItemVisualName(entry.name), entry])
);

/** Returns a safe icon/approved artwork for an existing game item, or fallback. */
export function resolveDocumentedItemVisual(name) {
  return documentedByName.get(normalizeItemVisualName(name)) || {
    name: String(name || ''),
    icon: 'package',
    approvedImage: null,
  };
}
