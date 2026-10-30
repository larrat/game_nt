import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { playHoverSound, playClickSound } from '../utils/audioEngine';
import SidebarIcon from './SidebarIcon';

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

export default function Sidebar({ player, isMobileOpen = false, onNavigate }) {
  const location = useLocation();
  const activeGroup = findScreenGroup(location.pathname);
  const [expanded, setExpanded] = useState(() => ({
    central: true,
    personagem: true,
    academia: true,
    ...(activeGroup ? { [activeGroup]: true } : {})
  }));
  const [audioOn, setAudioOn] = useState(() => Boolean(window.kurokageAudioEnabled));

  useEffect(() => {
    window.kurokageAudioEnabled = audioOn;
  }, [audioOn]);

  useEffect(() => {
    if (activeGroup) setExpanded(prev => (prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }));
  }, [activeGroup]);

  const toggleGroup = (id) => {
    playClickSound();
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const handleLinkClick = () => {
    playClickSound();
    if (onNavigate) onNavigate();
  };

  return (
    <aside className={'sidebar kuro-rpg-sidebar' + (isMobileOpen ? ' is-mobile-open' : '')} aria-label="Navegação principal do jogo">
      <div className="sidebar-brand-wrap">
        <div className="brand"><div className="mark" />KUROKAGE</div>
        <span className="kuro-rpg-sidebar__edition">NINJA RPG</span>
      </div>

      {player && (
        <div className="kuro-rpg-sidebar__player" aria-label="Personagem selecionado">
          <div className="kuro-rpg-sidebar__portrait">
            {player.avatar?.startsWith('/') ? <img src={player.avatar} alt="" /> : <span aria-hidden="true">忍</span>}
          </div>
          <div className="kuro-rpg-sidebar__player-text">
            <strong title={player.name}>{player.name}</strong>
            <span>Nv. {player.level || 1} · {player.rank || 'Estudante'}</span>
          </div>
        </div>
      )}

      <nav className="kuro-rpg-sidebar__navigation" aria-label="Áreas do Kurokage">
        {SCREEN_NAV.map(group => {
          const open = Boolean(expanded[group.id]);
          return (
            <section className="navgroup kuro-rpg-sidebar__group" key={group.id}>
              <h2 className="kuro-rpg-sidebar__heading">
                <button
                  type="button"
                  className={'navgroup-header kuro-rpg-sidebar__toggle' + (open ? ' open' : '')}
                  onClick={() => toggleGroup(group.id)}
                  onMouseEnter={playHoverSound}
                  aria-expanded={open}
                  aria-controls={'kuro-nav-' + group.id}
                >
                  <span className={'label' + (group.id === 'premium' ? ' text-gold' : '')}>{group.group}</span>
                  <span className="arrow" aria-hidden="true">▼</span>
                </button>
              </h2>
              <div className={'navgroup-content' + (open ? ' open' : '')}
                id={'kuro-nav-' + group.id} hidden={!open}>
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleLinkClick}
                    onMouseEnter={playHoverSound}
                    className={({ isActive }) =>
                      'navitem' + (isActive ? ' active' : '') + (group.id === 'premium' ? ' premium' : '')
                    }
                  >
                    <span className="kuro-rpg-sidebar__link-icon" aria-hidden="true">
                      <SidebarIcon label={item.label} />
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </section>
          );
        })}
      </nav>

      <div className="sidebar-footer kuro-rpg-sidebar__footer">
        <span>ERA DOS SHINOBI · TEMPORADA I</span>
        <button
          type="button"
          className="btn-ghost kuro-rpg-sidebar__sound"
          onClick={() => { playClickSound(); setAudioOn(value => !value); }}
          aria-pressed={audioOn}
          aria-label={audioOn ? 'Desativar som' : 'Ativar som'}
          title={audioOn ? 'Desativar som' : 'Ativar som'}
        >{audioOn ? '🔊' : '🔇'}</button>
      </div>
    </aside>
  );
}
