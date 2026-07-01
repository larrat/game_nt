/**
 * Constantes centralizadas do jogo Kurokage.
 * Importar daqui em vez de redefinir localmente em cada arquivo.
 */

export const VILLAGES = {
  1: 'Folha',
  2: 'Areia',
  3: 'Névoa',
  4: 'Pedra',
  5: 'Nuvem',
  6: 'Som',
  7: 'Chuva',
  8: 'Akatsuki',
};

export const VILLAGES_LIST = [
  { id: 1, name: 'Folha', icon: '🍃' },
  { id: 2, name: 'Areia', icon: '🏜️' },
  { id: 3, name: 'Névoa', icon: '🌫️' },
  { id: 4, name: 'Pedra', icon: '🪨' },
  { id: 5, name: 'Nuvem', icon: '☁️' },
  { id: 6, name: 'Som', icon: '🎵' },
  { id: 7, name: 'Chuva', icon: '🌧️' },
  { id: 8, name: 'Akatsuki', icon: '🔴' },
];

export const KAGES = {
  1: 'HOKAGE',
  2: 'KAZEKAGE',
  3: 'MIZUKAGE',
  4: 'TSUCHIKAGE',
  5: 'RAIKAGE',
  6: 'OTOKAGE',
  7: 'AMEKAGE',
};

export const RANK_ORDER = [
  'Estudante da Academia',
  'Genin',
  'Chunin',
  'Jounin',
  'ANBU',
  'Kage',
];

export const ELEMENTS = ['Katon', 'Futon', 'Raiton', 'Doton', 'Suiton'];

export const RARITY_COLORS = {
  'Único': 'var(--danger)',
  'Épico': 'var(--gold)',
  'Raro': 'var(--info)',
  'Incomum': 'var(--success)',
  'Comum': 'var(--paper)',
};
