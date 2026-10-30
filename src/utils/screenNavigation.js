// Navegação organizada pelas famílias documentadas das telas de RPG.
// Mantém todas as rotas atuais e a identidade própria do Kurokage.
export const SCREEN_NAV = [
  {
    id: 'central', group: 'Central',
    items: [{ to: '/dashboard', label: 'Painel inicial' }]
  },
  {
    id: 'personagem', group: 'Personagem',
    items: [
      { to: '/status', label: 'Status do Ninja' },
      { to: '/equipamentos', label: 'Equipamentos' },
      { to: '/clas', label: 'Clãs' },
      { to: '/elementos', label: 'Elementos' },
      { to: '/invocacoes', label: 'Invocações' }
    ]
  },
  {
    id: 'academia', group: 'Academia Ninja',
    items: [
      { to: '/treino', label: 'Treinamento' },
      { to: '/tecnicas', label: 'Técnicas e Jutsus' },
      { to: '/aprimorar-jutsus', label: 'Aprimorar Jutsus' },
      { to: '/tarefas', label: 'Missões' },
      { to: '/graduacoes', label: 'Graduações' },
      { to: '/exame', label: 'Exame Ninja' }
    ]
  },
  {
    id: 'combates', group: 'Combates e Jornada',
    items: [
      { to: '/dojo', label: 'Dojo' },
      { to: '/mapa', label: 'Mapa-múndi' },
      { to: '/historia', label: 'Modo História' },
      { to: '/evento', label: 'Eventos globais' },
      { to: '/historico', label: 'Histórico' },
      { to: '/ranking', label: 'Ranking' }
    ]
  },
  {
    id: 'vila', group: 'Vila e Serviços',
    items: [
      { to: '/vila', label: 'Vila' },
      { to: '/hospital', label: 'Hospital' },
      { to: '/ferreiro', label: 'Ferreiro' },
      { to: '/ichiraku', label: 'Ichiraku Ramen' },
      { to: '/portoes', label: '8 Portões' },
      { to: '/templo', label: 'Templo Ninja' }
    ]
  },
  {
    id: 'premium', group: 'Premium',
    items: [{ to: '/vip', label: 'Vantagens VIP' }]
  }
];

export const findScreenGroup = (pathname) =>
  SCREEN_NAV.find(group => group.items.some(item => item.to === pathname))?.id || null;

