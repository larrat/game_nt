import React from 'react';

export default function Tarefas({ player, updatePlayer }) {
  if (!player) return null;

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="eyebrow">Academia Ninja</div>
          <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>Tarefas Iniciais</h1>
        </div>
      </div>
      <div className="card">
        <p>Sistema de Tarefas está sendo portado para React...</p>
      </div>
    </div>
  );
}
