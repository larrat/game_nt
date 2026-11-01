import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { playHoverSound, playClickSound } from '../utils/audioEngine';
import SidebarIcon from './SidebarIcon';
import { SCREEN_NAV, filterScreenNavigation, findScreenGroup } from '../utils/screenNavigation';

const QUICK_LINKS = [
  { to: '/dashboard', title: 'Painel', icon: 'dashboard' },
  { to: '/treino', title: 'Treino', icon: 'dumbbell' },
  { to: '/tarefas', title: 'Missões', icon: 'clipboard' }
];

export default function Sidebar({ player, isMobileOpen = false, onNavigate }) {
  const location = useLocation();
  const activeGroup = findScreenGroup(location.pathname);
  const [expanded, setExpanded] = useState(() => ({
    central: true,
    ...(activeGroup ? { [activeGroup]: true } : {})
  }));
  const [searchQuery, setSearchQuery] = useState('');
  const [audioOn, setAudioOn] = useState(() => Boolean(window.kurokageAudioEnabled));
  const visibleGroups = filterScreenNavigation(searchQuery);
  const searching = Boolean(searchQuery.trim());

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
    setSearchQuery('');
    if (onNavigate) onNavigate();
  };

  return (
    <aside className={'sidebar kuro-rpg-sidebar kuro-rpg-sidebar-v3' + (isMobileOpen ? ' is-mobile-open' : '')} aria-label="Navegação principal do jogo">
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

      <div className="kuro-rpg-sidebar-v3__tools">
        <label className="kuro-rpg-sidebar-v3__search">
          <SidebarIcon name="search" size={17} />
          <span className="sr-only">Buscar telas no menu</span>
          <input
            type="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Buscar telas..."
            aria-label="Buscar telas no menu"
          />
        </label>
        <div className="kuro-rpg-sidebar-v3__quick-links" aria-label="Acesso rápido">
          {QUICK_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={handleLinkClick}
              onMouseEnter={playHoverSound}
              title={link.title}
              className={({ isActive }) =>
                'kuro-rpg-sidebar-v3__quick-link' + (isActive ? ' is-active' : '')
              }
            >
              <SidebarIcon name={link.icon} size={17} />
              <span>{link.title}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <nav className="kuro-rpg-sidebar__navigation" aria-label="Áreas do Kurokage">
        {visibleGroups.length === 0 && (
          <p className="kuro-rpg-sidebar-v3__empty" role="status">Nenhuma tela encontrada.</p>
        )}
        {visibleGroups.map(group => {
          const open = searching || Boolean(expanded[group.id]);
          const isCurrent = activeGroup === group.id;
          return (
            <section className="navgroup kuro-rpg-sidebar__group" key={group.id}>
              <h2 className="kuro-rpg-sidebar__heading">
                <button
                  type="button"
                  className={'navgroup-header kuro-rpg-sidebar__toggle' + (open ? ' open' : '') + (isCurrent ? ' is-current' : '')}
                  onClick={() => toggleGroup(group.id)}
                  onMouseEnter={playHoverSound}
                  aria-expanded={open}
                  aria-controls={'kuro-nav-' + group.id}
                  disabled={searching}
                >
                  <span className="kuro-rpg-sidebar-v3__group-label">
                    <span className="kuro-rpg-sidebar-v3__group-icon"><SidebarIcon name={group.icon} size={16} /></span>
                    <span className={'label' + (group.id === 'premium' ? ' text-gold' : '')}>{group.group}</span>
                  </span>
                  <span className="kuro-rpg-sidebar-v3__group-meta" aria-hidden="true">
                    <span className="kuro-rpg-sidebar-v3__count">{group.items.length}</span>
                    <SidebarIcon name={open ? 'chevronDown' : 'chevronRight'} size={15} />
                  </span>
                </button>
              </h2>
              <div
                className={'navgroup-content' + (open ? ' open' : '')}
                id={'kuro-nav-' + group.id}
                hidden={!open}
              >
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
                      <SidebarIcon name={item.icon} size={18} />
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
        >
          <SidebarIcon name={audioOn ? 'volumeOn' : 'volumeOff'} size={17} />
        </button>
      </div>
    </aside>
  );
}
