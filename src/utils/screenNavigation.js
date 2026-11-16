// Single source of truth for the in-game navigation and unified screen tab hubs.
// Icons use stable semantic keys, never translated display labels.
export const SCREEN_TAB_HUBS = [
  {
    id: 'arsenal',
    title: 'Arsenal & Forja',
    tabs: [
      { to: '/equipamentos', label: 'Equipamentos & Loja', icon: 'shield' },
      { to: '/ferreiro', label: 'Ferreiro (Refinamento)', icon: 'hammer' }
    ]
  },
  {
    id: 'poderes',
    title: 'Linhagem & Despertar',
    tabs: [
      { to: '/clas', label: 'Clãs', icon: 'users' },
      { to: '/elementos', label: 'Elementos', icon: 'flame' },
      { to: '/portoes', label: '8 Portões', icon: 'door' },
      { to: '/invocacoes', label: 'Invocações', icon: 'paw' },
      { to: '/templo', label: 'Templo Ninja', icon: 'landmark' }
    ]
  },
  {
    id: 'jutsus',
    title: 'Grimório de Jutsus',
    tabs: [
      { to: '/tecnicas', label: 'Aprender Técnicas', icon: 'scroll' },
      { to: '/aprimorar-jutsus', label: 'Aprimorar Jutsus', icon: 'sparkles' }
    ]
  },
  {
    id: 'carreira',
    title: 'Carreira Shinobi',
    tabs: [
      { to: '/graduacoes', label: 'Graduações', icon: 'award' },
      { to: '/exame', label: 'Exame Ninja', icon: 'graduation' }
    ]
  },
  {
    id: 'dojo',
    title: 'Central de Combate',
    tabs: [
      { to: '/dojo', label: 'Dojo & Raids', icon: 'swords' },
      { to: '/adversarios', label: 'Arquivo de Adversários', icon: 'users' },
      { to: '/historico', label: 'Histórico de Lutas', icon: 'history' }
    ]
  },
  {
    id: 'jornada',
    title: 'Jornada & Mundo',
    tabs: [
      { to: '/mapa', label: 'Mapa-múndi', icon: 'map' },
      { to: '/historia', label: 'Modo História', icon: 'book' },
      { to: '/evento', label: 'Eventos Globais', icon: 'calendar' },
      { to: '/ranking', label: 'Ranking Ninja', icon: 'trophy' }
    ]
  },
  {
    id: 'servicos',
    title: 'Vila & Suprimentos',
    tabs: [
      { to: '/vila', label: 'Vila Oculta', icon: 'home' },
      { to: '/hospital', label: 'Hospital Ninja', icon: 'heart' },
      { to: '/ichiraku', label: 'Ichiraku Ramen', icon: 'soup' }
    ]
  }
];

export const SCREEN_NAV = [
  {
    id: 'central', group: 'Central', icon: 'dashboard',
    items: [{ to: '/dashboard', label: 'Painel inicial', icon: 'dashboard' }]
  },
  {
    id: 'personagem', group: 'Personagem', icon: 'user',
    items: [
      { to: '/status', label: 'Status do Ninja', icon: 'user' },
      { to: '/equipamentos', label: 'Equipamentos', icon: 'shield', hubId: 'arsenal', tabCount: 2 },
      { to: '/clas', label: 'Clãs', icon: 'users', hubId: 'poderes', tabCount: 5 },
      { to: '/elementos', label: 'Elementos', icon: 'flame', hubId: 'poderes', isSubTab: true },
      { to: '/invocacoes', label: 'Invocações', icon: 'paw', hubId: 'poderes', isSubTab: true }
    ]
  },
  {
    id: 'academia', group: 'Academia Ninja', icon: 'academy',
    items: [
      { to: '/treino', label: 'Treinamento', icon: 'dumbbell' },
      { to: '/tarefas', label: 'Missões', icon: 'clipboard' },
      { to: '/tecnicas', label: 'Técnicas e Jutsus', icon: 'scroll', hubId: 'jutsus', tabCount: 2 },
      { to: '/aprimorar-jutsus', label: 'Aprimorar Jutsus', icon: 'sparkles', hubId: 'jutsus', isSubTab: true },
      { to: '/graduacoes', label: 'Graduações', icon: 'award', hubId: 'carreira', tabCount: 2 },
      { to: '/exame', label: 'Exame Ninja', icon: 'graduation', hubId: 'carreira', isSubTab: true }
    ]
  },
  {
    id: 'combates', group: 'Combates e Jornada', icon: 'swords',
    items: [
      { to: '/mapa', label: 'Mapa-múndi', icon: 'map', hubId: 'jornada', tabCount: 4 },
      { to: '/dojo', label: 'Dojo', icon: 'swords', hubId: 'dojo', tabCount: 3 },
      { to: '/historia', label: 'Modo História', icon: 'book', hubId: 'jornada' },
      { to: '/evento', label: 'Eventos globais', icon: 'calendar', hubId: 'jornada' },
      { to: '/ranking', label: 'Ranking', icon: 'trophy', hubId: 'jornada' },
      { to: '/adversarios', label: 'Arquivo de Adversários', icon: 'users', hubId: 'dojo', isSubTab: true },
      { to: '/historico', label: 'Histórico', icon: 'history', hubId: 'dojo', isSubTab: true }
    ]
  },
  {
    id: 'vila', group: 'Vila e Serviços', icon: 'home',
    items: [
      { to: '/vila', label: 'Vila', icon: 'home', hubId: 'servicos', tabCount: 3 },
      { to: '/hospital', label: 'Hospital', icon: 'heart', hubId: 'servicos' },
      { to: '/ichiraku', label: 'Ichiraku Ramen', icon: 'soup', hubId: 'servicos', isSubTab: true },
      { to: '/ferreiro', label: 'Ferreiro', icon: 'hammer', hubId: 'arsenal', isSubTab: true },
      { to: '/portoes', label: '8 Portões', icon: 'door', hubId: 'poderes', isSubTab: true },
      { to: '/templo', label: 'Templo Ninja', icon: 'landmark', hubId: 'poderes', isSubTab: true }
    ]
  },
  {
    id: 'premium', group: 'Premium', icon: 'crown',
    items: [{ to: '/vip', label: 'Vantagens VIP', icon: 'crown' }]
  }
];

export const findScreenHub = (pathname) =>
  SCREEN_TAB_HUBS.find(hub => hub.tabs.some(tab => tab.to === pathname)) || null;

export const findScreenGroup = (pathname) =>
  SCREEN_NAV.find(group => group.items.some(item => item.to === pathname))?.id || null;

export function getPrimaryScreenNavigation() {
  return SCREEN_NAV.map(group => ({
    ...group,
    items: group.items.filter(item => !item.isSubTab)
  }));
}

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
