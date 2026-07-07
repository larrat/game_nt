import React from 'react';

function StatBar({ label, current, max, percent, color, alignRight }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        className="flex-between paper"
        style={{
          fontSize: '11px',
          marginBottom: 4,
          flexDirection: alignRight ? 'row-reverse' : 'row'
        }}
      >
        <span style={{ fontWeight: 600, color }}>{label}</span>
        <span className="mono" style={{ opacity: 0.85, fontSize: '10px' }}>{current}/{max}</span>
      </div>
      <div
        className="progress-track"
        style={{ height: 10, display: 'flex', justifyContent: alignRight ? 'flex-end' : 'flex-start' }}
      >
        <div
          className={`progress-fill ${color === '#ef4444' ? 'red' : color === '#4b9eff' ? 'blue' : 'yellow'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function CombatFighterCard({
  side = 'left',
  shake = false,
  fcts = [],
  bgStyle = {},
  portrait,
  name,
  level,
  subtitle,
  badges = [],
  hp,
  maxHp,
  cp,
  maxCp,
  st,
  maxSt,
  hpPct,
  cpPct,
  stPct,
  isMirror = false
}) {
  const alignRight = side === 'right';
  const isImg = typeof portrait === 'string' && portrait.startsWith('/');

  return (
    <div
      className={`combat-fighter-v2 ${shake ? 'damage-flash' : ''} ${isMirror ? 'enemy-mirror' : ''}`}
      style={bgStyle}
    >
      {fcts.map(f => (
        <div key={f.id} className={`fct fct-${f.type}`}>{f.text}</div>
      ))}

      <div className="combat-portrait-wrap">
        {isImg ? (
          <img src={portrait} alt={name} />
        ) : (
          <span className="combat-portrait-emoji">{portrait || '🥷'}</span>
        )}
      </div>

      <div className="combat-fighter-info">
        <div style={{ textAlign: alignRight ? 'right' : 'left', marginBottom: 8 }}>
          <h3
            className={alignRight ? 'danger' : 'paper'}
            style={{ fontSize: '18px', marginBottom: 4, lineHeight: 1.2 }}
          >
            {isMirror && '⚠️ '}{name}
          </h3>
          <div className="mono muted" style={{ fontSize: '11px' }}>
            Lvl. {level}{subtitle ? ` · ${subtitle}` : ''}
          </div>
        </div>

        {badges.length > 0 && (
          <div
            className="flex-row"
            style={{
              gap: 6,
              flexWrap: 'wrap',
              marginBottom: 10,
              justifyContent: alignRight ? 'flex-end' : 'flex-start'
            }}
          >
            {badges}
          </div>
        )}

        <StatBar label="HP" current={hp} max={maxHp} percent={hpPct} color="#ef4444" alignRight={alignRight} />
        <StatBar label="Chakra" current={cp} max={maxCp} percent={cpPct} color="#4b9eff" alignRight={alignRight} />
        <StatBar label="Stamina" current={st} max={maxSt} percent={stPct} color="#f59e0b" alignRight={alignRight} />
      </div>
    </div>
  );
}
