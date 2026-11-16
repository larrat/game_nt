import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarIcon from './SidebarIcon';
import { findScreenHub } from '../utils/screenNavigation';
import { playClickSound, playHoverSound } from '../utils/audioEngine';

export default function ScreenSubNav() {
  const { pathname } = useLocation();
  const hub = findScreenHub(pathname);
  if (!hub || hub.tabs.length <= 1) return null;

  return (
    <nav
      aria-label={'Abas de ' + hub.title}
      className="kuro-screen-subnav mx-auto w-full max-w-[1220px] px-6 pt-4 pb-1 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-muted">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold" aria-hidden="true" />
        <span>{hub.title}</span>
      </div>
      <div
        role="tablist"
        aria-label={hub.title}
        className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-white/10 bg-black/35 p-1 backdrop-blur-sm"
      >
        {hub.tabs.map(tab => {
          const active = pathname === tab.to;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              role="tab"
              aria-selected={active}
              onClick={playClickSound}
              onMouseEnter={playHoverSound}
              className={
                'inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold tracking-wide transition-colors whitespace-nowrap ' +
                (active
                  ? 'bg-gold/18 text-gold border border-gold/45 shadow-sm'
                  : 'text-paper/75 hover:text-paper hover:bg-white/5 border border-transparent')
              }
            >
              <SidebarIcon name={tab.icon} size={15} />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
