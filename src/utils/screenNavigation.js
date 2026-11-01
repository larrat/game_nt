// Single source of truth for the in-game navigation.
// Icons use stable semantic keys, never translated display labels.
export const SCREEN_NAV = [
  {
    id: 'central', group: 'Central', icon: 'dashboard',
    items: [{ to: '/dashboard', label: 'Painel inicial', icon: 'dashboard' }]
  },
  {
    id: 'personagem', group: 'Personagem', icon: 'user',
    items: [
      { to: '/status', label: 'Status do Ninja', icon: 'user' },
      { to: '/equipamentos', label: 'Equipamentos', icon: 'shield' },
      { to: '/clas', label: 'Clãs', icon: 'users' },
      { to: '/elementos', label: 'Elementos', icon: 'flame' },
      { to: '/invocacoes', label: 'Invocações', icon: 'paw' }
    ]
  },
  {
    id: 'academia', group: 'Academia Ninja', icon: 'academy',
    items: [
      { to: '/treino', label: 'Treinamento', icon: 'dumbbell' },
      { to: '/tecnicas', label: 'Técnicas e Jutsus', icon: 'scroll' },
      { to: '/aprimorar-jutsus', label: 'Aprimorar Jutsus', icon: 'sparkles' },
      { to: '/tarefas', label: 'Missões', icon: 'clipboard' },
      { to: '/graduacoes', label: 'Graduações', icon: 'award' },
      { to: '/exame', label: 'Exame Ninja', icon: 'graduation' }
    ]
  },
  {
    id: 'combates', group: 'Combates e Jornada', icon: 'swords',
    items: [
      { to: '/dojo', label: 'Dojo', icon: 'swords' },
      { to: '/adversarios', label: 'Arquivo de Adversários', icon: 'users' },
      { to: '/mapa', label: 'Mapa-múndi', icon: 'map' },
      { to: '/historia', label: 'Modo História', icon: 'book' },
      { to: '/evento', label: 'Eventos globais', icon: 'calendar' },
      { to: '/historico', label: 'Histórico', icon: 'history' },
      { to: '/ranking', label: 'Ranking', icon: 'trophy' }
    ]
  },
  {
    id: 'vila', group: 'Vila e Serviços', icon: 'home',
    items: [
      { to: '/vila', label: 'Vila', icon: 'home' },
      { to: '/hospital', label: 'Hospital', icon: 'heart' },
      { to: '/ferreiro', label: 'Ferreiro', icon: 'hammer' },
      { to: '/ichiraku', label: 'Ichiraku Ramen', icon: 'soup' },
      { to: '/portoes', label: '8 Portões', icon: 'door' },
      { to: '/templo', label: 'Templo Ninja', icon: 'landmark' }
    ]
  },
  {
    id: 'premium', group: 'Premium', icon: 'crown',
    items: [{ to: '/vip', label: 'Vantagens VIP', icon: 'crown' }]
  }
];

export const findScreenGroup = (pathname) =>
  SCREEN_NAV.find(group => group.items.some(item => item.to === pathname))?.id || null;

// Search also works without accents: "tecnicas", "missoes" and "cla".
const normalizeSearch = value =>
  String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

export function filterScreenNavigation(query) {
  const term = normalizeSearch(query);
  if (!term) return SCREEN_NAV;

  return SCREEN_NAV.map(group => {
    const items = normalizeSearch(group.group).includes(term)
      ? group.items
      : group.items.filter(item => normalizeSearch(item.label).includes(term));
    return { ...group, items };
  }).filter(group => group.items.length > 0);
}
