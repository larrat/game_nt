import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar({ player }) {
  return (
    <aside className="sidebar">
      <div className="brand"><div className="mark"></div>KUROKAGE</div>
      
      <div className="navgroup">
        <div className="label">Personagem</div>
        <NavLink to="/dashboard" className={({ isActive }) => `navitem ${isActive ? 'active' : ''}`}>
          <div className="dot"></div>Ficha
        </NavLink>
        <NavLink to="/tecnicas" className={({ isActive }) => `navitem ${isActive ? 'active' : ''}`}>
          <div className="dot"></div>Técnicas
        </NavLink>
        <NavLink to="/equipamentos" className={({ isActive }) => `navitem ${isActive ? 'active' : ''}`}>
          <div className="dot"></div>Inventário
        </NavLink>
        <NavLink to="/portoes" className={({ isActive }) => `navitem ${isActive ? 'active' : ''}`}>
          <div className="dot"></div>8 Portões de Chakra
        </NavLink>
      </div>

      <div className="navgroup">
        <div className="label">Academia</div>
        <NavLink to="/tarefas" className={({ isActive }) => `navitem ${isActive ? 'active' : ''}`}>
          <div className="dot"></div>Tarefas Iniciais
        </NavLink>
        <NavLink to="/graduacoes" className={({ isActive }) => `navitem ${isActive ? 'active' : ''}`}>
          <div className="dot"></div>Graduações
        </NavLink>
      </div>

      <div className="navgroup">
        <div className="label">Mundo</div>
        <NavLink to="/objetivos" className={({ isActive }) => `navitem ${isActive ? 'active' : ''}`}>
          <div className="dot"></div>Missões
        </NavLink>
        <NavLink to="/ranking" className={({ isActive }) => `navitem ${isActive ? 'active' : ''}`}>
          <div className="dot"></div>Ranking
        </NavLink>
        <NavLink to="/vila" className={({ isActive }) => `navitem ${isActive ? 'active' : ''}`}>
          <div className="dot"></div>Vila Atual
        </NavLink>
      </div>

      <div className="sidebar-footer">
        <div>TEMPORADA IV</div>
        <div>Servidor S1 · Ping: 42ms</div>
      </div>
    </aside>
  );
}
