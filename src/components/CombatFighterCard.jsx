import React from 'react';
import {
  calculateAtkTaiBuk,
  calculateAtkNinGen,
  calculateDefTaiBuk,
  calculateDefNinGen,
  calculateCritChance,
  calculateDodgeChance,
  calculatePerfuracao,
  calculatePrecisao,
  calculateConcentracao,
  calculatePercepcao,
  calculateConviccao,
  calculateDeterminacao,
  getClanBonus
} from '../utils/engine';

function StatBar({ label, current, max, percent, color, alignRight }) {
  return (
    <div className="mb-2">
      <div
        className={`flex-between paper text-xs mb-1 ${alignRight ? 'flex-row-reverse' : 'flex-row'}`}
      >
        <span className="font-semibold" style={{ color }}>{label}</span>
        <span className="mono opacity-85 text-xs">{current}/{max}</span>
      </div>
      <div
        className={`progress-track h-2 flex ${alignRight ? 'justify-end' : 'justify-start'}`}
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
  isMirror = false,
  clan = null,
  fighterObj = null
}) {
  const alignRight = side === 'right';
  const isImg = typeof portrait === 'string' && portrait.startsWith('/');

  // Generate Stats Summary
  const statsList = fighterObj ? [
    { label: 'Ataque (Tai / Buk)', val: calculateAtkTaiBuk(fighterObj) },
    { label: 'Ataque (Nin / Gen)', val: calculateAtkNinGen(fighterObj) },
    { label: 'Defesa (Tai / Buk)', val: calculateDefTaiBuk(fighterObj) },
    { label: 'Defesa (Nin / Gen)', val: calculateDefNinGen(fighterObj) },
    { label: 'Perfuração', val: `${calculatePerfuracao(fighterObj)}%` },
    { label: 'Precisão', val: calculatePrecisao(fighterObj) },
    { label: 'Determinação', val: `${calculateDeterminacao(fighterObj)}%` },
    { label: 'Convicção', val: `${calculateConviccao(fighterObj)}%` },
    { label: 'Percepção', val: `${calculatePercepcao(fighterObj)}%` },
    { label: 'Concentração', val: `${calculateConcentracao(fighterObj)}%` },
    { label: 'Crítico', val: `${calculateCritChance(fighterObj)}%` },
    { label: 'Esquiva', val: `${calculateDodgeChance(fighterObj)}%` }
  ] : [];

  const clanData = getClanBonus(fighterObj);
  const clanBonusDesc = clanData?.desc || '';
  const customStatsInfo = fighterObj?.clan_custom_stats || {};

  return (
    <div
      className={`combat-fighter-v2 ${shake ? 'damage-flash' : ''} ${isMirror ? 'enemy-mirror' : ''}`}
      style={bgStyle}
    >
      {/* Top Icons Bar — renderizado dentro do card no topo */}
      {fighterObj && (
        <div className={`flex ${alignRight ? 'flex-row-reverse' : 'flex-row'} gap-2 px-3 pt-2 z-20`} style={{ position: 'relative' }}>
          
          {/* Stats Tooltip */}
          <div className="relative group/stats cursor-help" style={{ zIndex: 30 }}>
            <div className="bg-ink p-1 rounded border border-line text-sm hover:bg-black-alpha-60 transition-colors" style={{ lineHeight: 1 }}>
              📊
            </div>
            <div className={`absolute top-full mt-1 ${alignRight ? 'right-0' : 'left-0'} w-64 bg-black-alpha-95 border border-line-bright p-3 rounded-md text-xs opacity-0 invisible group-hover/stats:opacity-100 group-hover/stats:visible transition-all shadow-lg`} style={{ zIndex: 9999, pointerEvents: 'none' }}>
              <h4 className="text-gold font-bold mb-2 pb-1 border-b border-line-solid text-left">Resumo dos Atributos</h4>
              <div className="flex-col gap-1">
                {statsList.map((s, i) => (
                  <div key={i} className="flex-between text-muted text-left">
                    <span>{s.label}:</span>
                    <span className="mono text-white">{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Clan Tooltip */}
          {clan && (
            <div className="relative group/clan cursor-help" style={{ zIndex: 30 }}>
              <div className="bg-ink p-1 rounded border border-line text-sm hover:bg-black-alpha-60 transition-colors" style={{ lineHeight: 1 }}>
                🧬
              </div>
              <div className={`absolute top-full mt-1 ${alignRight ? 'right-0' : 'left-0'} w-56 bg-black-alpha-95 border border-line-bright p-3 rounded-md text-xs opacity-0 invisible group-hover/clan:opacity-100 group-hover/clan:visible transition-all shadow-lg`} style={{ zIndex: 9999, pointerEvents: 'none' }}>
                <h4 className="text-gold font-bold mb-2 pb-1 border-b border-line-solid text-left">{clan} Lvl. {fighterObj.clan_lvl || 0}</h4>
                <div className="flex-col gap-1 text-muted text-left">
                  {Object.entries(customStatsInfo).map(([stat, val]) => (
                    <div key={stat} className="flex-between capitalize">
                      <span>{stat}:</span>
                      <span className="text-green">+{val * (fighterObj.clan_lvl || 0)}</span>
                    </div>
                  ))}
                  {clanBonusDesc && (
                    <div className="mt-2 text-gold italic">{clanBonusDesc}</div>
                  )}
                  <div className="mt-2 text-danger">Passiva ativa em combate</div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {fcts.map(f => (
        <div key={f.id} className={`fct fct-${f.type}`}>{f.text}</div>
      ))}

      <div className="combat-portrait-wrap relative">
        {clan && (
          <div className={`absolute top-2 ${alignRight ? 'right-2' : 'left-2'} z-10 opacity-50`}>
            <img 
              src={`/images/clan_${clan.toLowerCase()}.jpg`} 
              alt={clan} 
              className="w-8 h-8 rounded-md border border-line-solid object-cover grayscale opacity-70 mix-blend-screen shadow-lg"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
        {isImg ? (
          <img src={portrait} alt={name} />
        ) : (
          <span className="combat-portrait-emoji">{portrait || '🥷'}</span>
        )}
      </div>

      <div className="combat-fighter-info">
        <div className={`mb-2 ${alignRight ? 'text-right' : 'text-left'}`}>
          <h3
            className={`text-lg mb-1 leading-tight ${alignRight ? 'danger' : 'paper'}`}
          >
            {isMirror && '⚠️ '}{name}
          </h3>
          <div className="mono muted text-xs">
            Lvl. {level}{subtitle ? ` · ${subtitle}` : ''}
          </div>
        </div>

        {badges.length > 0 && (
          <div
            className={`flex-row flex-wrap gap-xs mb-2 ${alignRight ? 'justify-end' : 'justify-start'}`}
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
