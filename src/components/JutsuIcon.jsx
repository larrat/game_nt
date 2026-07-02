import React from 'react';

const JutsuIcon = ({ jutsu, size = 64 }) => {
  const name = (jutsu.name || '').toLowerCase();
  const cat = (jutsu.category || '').toLowerCase();
  const elem = (jutsu.element || cat).toLowerCase();

  // Cores base por elemento/estilo
  const colors = {
    katon: { bg1: '#ef4444', bg2: '#b91c1c', stroke: '#fca5a5' },
    suiton: { bg1: '#3b82f6', bg2: '#1d4ed8', stroke: '#93c5fd' },
    doton: { bg1: '#a16207', bg2: '#713f12', stroke: '#fde047' },
    raiton: { bg1: '#eab308', bg2: '#a16207', stroke: '#fef08a' },
    futon: { bg1: '#10b981', bg2: '#047857', stroke: '#6ee7b7' },
    goken: { bg1: '#f97316', bg2: '#c2410c', stroke: '#fdba74' },
    juken: { bg1: '#8b5cf6', bg2: '#5b21b6', stroke: '#c4b5fd' },
    kenjutsu: { bg1: '#64748b', bg2: '#334155', stroke: '#cbd5e1' },
    taijutsu: { bg1: '#f97316', bg2: '#c2410c', stroke: '#fdba74' },
    genjutsu: { bg1: '#d946ef', bg2: '#a21caf', stroke: '#f5d0fe' },
    default: { bg1: '#475569', bg2: '#1e293b', stroke: '#94a3b8' }
  };

  const theme = colors[elem] || colors[cat] || colors.default;

  // Lógica para definir os "paths" (desenhos) baseados no nome da técnica
  let innerArt = null;

  if (name.includes('bola de fogo') || name.includes('fênix') || elem === 'katon') {
    innerArt = (
      <path d="M32 10 Q20 30 20 45 A12 12 0 0 0 44 45 Q44 30 32 10 Z" fill={theme.stroke} opacity="0.9" />
    );
  } else if (name.includes('água') || name.includes('dragão') || elem === 'suiton') {
    innerArt = (
      <path d="M32 15 C20 30 15 40 15 45 A17 17 0 0 0 49 45 C49 40 44 30 32 15 Z" fill={theme.stroke} opacity="0.9" />
    );
  } else if (name.includes('lama') || name.includes('pedra') || elem === 'doton') {
    innerArt = (
      <>
        <polygon points="15,50 25,30 35,50" fill={theme.stroke} opacity="0.8" />
        <polygon points="30,50 40,20 50,50" fill={theme.stroke} opacity="0.9" />
      </>
    );
  } else if (name.includes('raio') || name.includes('kirin') || elem === 'raiton') {
    innerArt = (
      <polygon points="35,10 20,35 30,35 25,55 45,25 35,25" fill="#ffffff" opacity="0.9" />
    );
  } else if (name.includes('vento') || name.includes('rasen') || elem === 'futon') {
    innerArt = (
      <>
        <circle cx="32" cy="32" r="12" fill="none" stroke={theme.stroke} strokeWidth="4" />
        <path d="M32 20 Q45 20 45 10 M32 44 Q20 44 20 54 M20 32 Q20 20 10 20 M44 32 Q44 45 54 45" stroke={theme.stroke} strokeWidth="3" fill="none" />
      </>
    );
  } else if (name.includes('lótus') || elem === 'goken' || cat === 'taijutsu') {
    innerArt = (
      <circle cx="32" cy="32" r="14" fill="none" stroke={theme.stroke} strokeWidth="6" strokeDasharray="6 4" />
    );
  } else if (name.includes('suave') || elem === 'juken') {
    innerArt = (
      <>
        <circle cx="32" cy="32" r="16" fill="none" stroke={theme.stroke} strokeWidth="2" />
        <circle cx="32" cy="32" r="4" fill={theme.stroke} />
      </>
    );
  } else if (name.includes('espada') || elem === 'kenjutsu' || cat === 'bukijutsu') {
    innerArt = (
      <path d="M20 50 L45 15 L50 20 L25 55 Z M15 55 L20 50 L25 55 L20 60 Z" fill={theme.stroke} />
    );
  } else if (cat === 'genjutsu') {
    innerArt = (
      <>
        <path d="M15 32 Q32 15 49 32 Q32 49 15 32 Z" fill="none" stroke={theme.stroke} strokeWidth="3" />
        <circle cx="32" cy="32" r="6" fill={theme.stroke} />
      </>
    );
  } else {
    innerArt = <circle cx="32" cy="32" r="10" fill={theme.stroke} />;
  }

  return (
    <svg width="100%" height="100%" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', borderRadius: '8px' }}>
      <defs>
        <linearGradient id={`grad-${jutsu.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.bg1} />
          <stop offset="100%" stopColor={theme.bg2} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#grad-${jutsu.id})`} rx="8" />
      
      {/* Background glow para dar o efeito anime */}
      <circle cx="32" cy="32" r="20" fill="#000" opacity="0.3" />
      
      {/* Arte Interna renderizada dinamicamente */}
      {innerArt}
    </svg>
  );
};

export default JutsuIcon;
