import React from 'react';

export default function Dashboard({ player }) {
  if (!player) return null;

  const maxXP = player.level * 1000;
  const xpPercent = Math.min(100, (player.xp / maxXP) * 100);
  
  const hp = 100 + (player.level * 20) + ((player.stamina_pts || 0) * 2);
  const chakra = 50 + (player.level * 10) + ((player.stamina_pts || 0) * 1);
  const atk = Math.floor((player.tai || 0) / 2) + 5; // Base attack

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="eyebrow">Ficha do personagem</div>
          <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>{player.name}</h1>
          <div className="sub">Ryous: <span style={{ color: 'var(--gold)' }}>{player.ryous}</span></div>
        </div>
        <div className="seal-badge">
          <div className="ring">{player.level}</div>
          <div className="txt">Rank atual<strong>{player.rank || 'Estudante da Academia'}</strong></div>
        </div>
      </div>

      <div className="grid">
        {/* LEFT COLUMN: AVATAR & STATS */}
        <div className="card">
          <div className="avatar-block">
            <div className="avatar">忍</div>
            <h2 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '20px', marginBottom: '4px' }}>{player.name}</h2>
            <div className="clan" style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {player.clan ? `Clã ${player.clan}` : 'Sem Clã'}
            </div>
          </div>

          <div className="xp-bar">
            <div className="meta" style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>
              <span>XP</span><span>{player.xp} / {maxXP}</span>
            </div>
            <div className="track" style={{ height: '6px', background: 'var(--ink-raised)', position: 'relative' }}>
              <div className="fill" style={{ width: `${xpPercent}%`, height: '100%', background: 'var(--seal-bright)', transition: 'width 0.3s' }}></div>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Vida (HP)</span>
              <span style={{ color: 'var(--paper)', fontFamily: "'JetBrains Mono', monospace" }}>{hp}</span>
            </div>
            <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Chakra (CP)</span>
              <span style={{ color: 'var(--paper)', fontFamily: "'JetBrains Mono', monospace" }}>{chakra}</span>
            </div>
            <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Stamina Base</span>
              <span style={{ color: 'var(--paper)', fontFamily: "'JetBrains Mono', monospace" }}>{player.stamina_pts || 0}</span>
            </div>
            <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Taijutsu</span>
              <span style={{ color: 'var(--paper)', fontFamily: "'JetBrains Mono', monospace" }}>{player.tai || 0}</span>
            </div>
            <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Ninjutsu</span>
              <span style={{ color: 'var(--paper)', fontFamily: "'JetBrains Mono', monospace" }}>{player.nin || 0}</span>
            </div>
            <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Ataque Físico Base</span>
              <span style={{ color: 'var(--paper)', fontFamily: "'JetBrains Mono', monospace" }}>{atk}</span>
            </div>
            <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)' }}>Velocidade</span>
              <span style={{ color: 'var(--paper)', fontFamily: "'JetBrains Mono', monospace" }}>{player.vel || 0}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SKILLS & QUESTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* SKILLS / JUTSUS */}
          <div className="card">
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '17px', fontWeight: 600 }}>Técnicas equipadas</h3>
              <span className="tag" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--gold)', letterSpacing: '1px' }}>
                {player.activeJutsus?.length || 0} ATIVAS
              </span>
            </div>
            <div className="skills-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
              {player.activeJutsus?.length > 0 ? (
                player.activeJutsus.map((j, idx) => (
                  <div key={idx} style={{ background: 'var(--ink)', padding: '16px', border: '1px solid var(--line)', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📜</div>
                    <div style={{ fontSize: '12px', color: 'var(--paper)' }}>{j.name}</div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                  Nenhum jutsu equipado. Vá até a aba Técnicas.
                </div>
              )}
            </div>
          </div>

          {/* QUESTS / MISSIONS */}
          <div className="card">
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '17px', fontWeight: 600 }}>Missões em andamento</h3>
              <span className="tag" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--gold)', letterSpacing: '1px' }}>0 ATIVAS</span>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              Nenhuma missão ativa no momento. Vá ao painel de Missões para iniciar.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
