import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { playHoverSound, playClickSound } from '../utils/audioEngine';
import SidebarIcon from './SidebarIcon';

import { SCREEN_NAV, findScreenGroup } from '../utils/screenNavigation';

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
