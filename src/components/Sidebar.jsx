import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { calculateXPForLevel, calculateLevelFromXP } from '../utils/engine';
import { playHoverSound, playClickSound } from '../utils/audioEngine';
import SidebarIcon from './SidebarIcon';

const NAV = [
  {
    group: 'Personagem',
    items: [
      { to: '/dashboard', icon: '/images/imgi_29_index.png', label: 'Ficha' },
      { to: '/status', icon: '👤', label: 'Status' },
      { to: '/treino', icon: '/images/imgi_10_stamina.png', label: 'Treinamento' },
      { to: '/elementos', icon: '/images/imgi_9_chakra.png', label: 'Elementos' },
      { to: '/tecnicas', icon: '/images/imgi_13_passe.png', label: 'Técnicas' },
      { to: '/aprimorar-jutsus', icon: '/images/imgi_46_scroll.png', label: 'Aprimorar Jutsus' },
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
      { to: '/invocacoes', icon: '🐾', label: 'Invocações' },
    ]
  },
  {
    group: 'Academia',
    items: [
      { to: '/tarefas', icon: '/images/imgi_14_rotina.png', label: 'Missões' },
      { to: '/exame', icon: '📜', label: 'Exame Ninja' },
      { to: '/graduacoes', icon: '/images/imgi_126_star.png', label: 'Graduações' },
    ]
  },
  {
    group: 'Mundo',
    items: [
      { to: '/dojo', icon: '/images/imgi_112_1.png', label: 'Dojo' },
      { to: '/historico', icon: '📜', label: 'Histórico' },
      { to: '/historia', icon: '📖', label: 'Modo História' },
      { to: '/ranking', icon: '/images/imgi_11_round46.png', label: 'Ranking' },
      { to: '/vila', icon: '/images/imgi_108_Noticias.png', label: 'Vila' },
      { to: '/evento', icon: '🌎', label: 'Evento Global' },
      { to: '/ferreiro', icon: '🔨', label: 'Ferreiro' },
      { to: '/mapa', icon: '/images/imgi_135_shield.png', label: 'Mapa-múndi' },
      { to: '/ichiraku', icon: '/images/imgi_21_Mochila.png', label: 'Ichiraku Ramen' },
    ]
  }
];

export default function Sidebar({ player }) {
  const [expanded, setExpanded] = useState({
    'Personagem': true,
    'Mundo': true,
  });

  const [audioOn, setAudioOn] = useState(window.kurokageAudioEnabled);

  useEffect(() => {
    window.kurokageAudioEnabled = audioOn;
  }, [audioOn]);

  const toggleGroup = (groupName) => {
    playClickSound();
    setExpanded(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleLinkClick = () => {
    playClickSound();
  };

  const handleMouseEnter = () => {
    playHoverSound();
  };

  // XP logic moved to TopBar

  return (
    <aside className="sidebar">
      <div className="sidebar-brand-wrap">
        <div className="brand">
          <div className="mark"></div>
          KUROKAGE
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {NAV.map((group) => {
          const isOpen = expanded[group.group];
          return (
            <div className="navgroup" key={group.group}>
              <div 
                className={`navgroup-header ${isOpen ? 'open' : ''}`} 
                onClick={() => toggleGroup(group.group)}
                onMouseEnter={handleMouseEnter}
              >
                <div className={`label ${group.group === 'Premium' ? 'text-gold' : 'text-muted'}`}>
                  {group.group}
                </div>
                <div className="arrow">▼</div>
              </div>
              
              <div className={`navgroup-content ${isOpen ? 'open' : ''}`}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleLinkClick}
                    onMouseEnter={handleMouseEnter}
                    className={({ isActive }) => `navitem${isActive ? ' active' : ''} ${group.group === 'Premium' ? 'premium' : ''}`}
                  >
                    <span className="flex items-center justify-center w-5 h-5 shrink-0 text-inherit">
                      <SidebarIcon label={item.label} />
                    </span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer border-t border-line p-4 flex flex-col gap-2">
        
        <div className="flex-between mt-0">
          <div className="flex-col">
            <div className="text-gold mb-1 font-semibold text-xs">S1 · {player?.name || '---'}</div>
            <div className="opacity-50 text-[11px]">v2.0 Kurokage</div>
          </div>
          
          <button 
            className="btn-ghost p-1.5 text-base rounded border border-line"
            onClick={() => { playClickSound(); setAudioOn(!audioOn); }}
            title={audioOn ? 'Desativar Som' : 'Ativar Som'}
          >
            {audioOn ? '🔊' : '🔇'}
          </button>
        </div>

      </div>
    </aside>
  );
}
