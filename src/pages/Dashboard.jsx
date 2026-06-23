import React from 'react';

export default function Dashboard({ player }) {
  if (!player) return null;

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="eyebrow">Ficha do Personagem</div>
          <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>{player.name}</h1>
          <div className="sub">Patente: {player.rank}</div>
        </div>
      </div>
      <div className="card">
        <p>A ficha detalhada está sendo portada para React...</p>
      </div>
    </div>
  );
}
