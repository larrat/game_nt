import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV = [
  {
    group: 'Personagem',
    items: [
      { to: '/dashboard', icon: '/images/imgi_29_index.png', label: 'Ficha' },
      { to: '/treino', icon: '/images/imgi_10_stamina.png', label: 'Treinamento' },
      { to: '/elementos', icon: '/images/imgi_9_chakra.png', label: 'Elementos' },
      { to: '/tecnicas', icon: '/images/imgi_13_passe.png', label: 'Técnicas' },
      { to: '/equipamentos', icon: '/images/imgi_21_Mochila.png', label: 'Inventário' },
      { to: '/portoes', icon: '/images/imgi_8_heart.png', label: '8 Portões' },
      { to: '/templo', icon: '/images/imgi_12_templo.png', label: 'Templo Ninja' },
    ]
  },
  {
    group: 'Premium',
    items: [
      { to: '/vip', icon: '/images/imgi_172_vip.png', label: 'Vantagens VIP' },
    ]
  },
  {
    group: 'Linhagem',
    items: [
      { to: '/clas', icon: '/images/imgi_32_star.png', label: 'Clãs' },
    ]
  },
  {
    group: 'Academia',
    items: [
      { to: '/tarefas', icon: '/images/imgi_14_rotina.png', label: 'Tarefas' },
      { to: '/graduacoes', icon: '/images/imgi_126_star.png', label: 'Graduações' },
    ]
  },
  {
    group: 'Mundo',
    items: [
      { to: '/dojo', icon: '/images/imgi_112_1.png', label: 'Dojo' },
      { to: '/ranking', icon: '/images/imgi_11_round46.png', label: 'Ranking' },
      { to: '/vila', icon: '/images/imgi_108_Noticias.png', label: 'Vila' },
      { to: '/mapa', icon: '/images/imgi_135_shield.png', label: 'Mapa-múndi' },
    ]
  }
];

export default function Sidebar({ player }) {
  // By default, open 'Personagem' and 'Mundo'
  const [expanded, setExpanded] = React.useState({
    'Personagem': true,
    'Mundo': true,
  });

  const toggleGroup = (groupName) => {
    setExpanded(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand-wrap">
        <div className="brand">
          <div className="mark"></div>
          KUROKAGE
        </div>
      </div>

      {NAV.map((group) => {
        const isOpen = expanded[group.group];
        return (
          <div className="navgroup" key={group.group}>
            <div 
              className={`navgroup-header ${isOpen ? 'open' : ''}`} 
              onClick={() => toggleGroup(group.group)}
            >
              <div className="label" style={{ color: group.group === 'Premium' ? 'var(--gold)' : 'var(--muted)' }}>
                {group.group}
              </div>
              <div className="arrow">▼</div>
            </div>
            
            <div className={`navgroup-content ${isOpen ? 'open' : ''}`}>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `navitem${isActive ? ' active' : ''} ${group.group === 'Premium' ? 'premium' : ''}`}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', flexShrink: 0 }}>
                    <img src={item.icon} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}

      <div className="sidebar-footer">
        <div style={{ color: 'var(--gold)', marginBottom: '4px', fontWeight: 600 }}>TEMPORADA IV</div>
        <div>S1 · {player?.name || '---'}</div>
        <div style={{ marginTop: '4px', opacity: 0.5 }}>v2.0 Kurokage</div>
      </div>
    </aside>
  );
}
