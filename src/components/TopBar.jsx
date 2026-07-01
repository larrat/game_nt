import React from 'react';
import { calculateHP, calculateChakra } from '../utils/engine';

export default function TopBar({ player }) {
  if (!player) return null;

  const maxHp = calculateHP(player);
  const hpPercent = 100; // Por enquanto, vida cheia. Depois podemos adicionar player.current_hp

  const maxCp = calculateChakra(player);
  const cpPercent = 100;

  const maxSp = player.stamina_pts || 0; // Usando a coluna stamina_pts
  const spPercent = 100;

  return (
    <div className="topbar-global" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(10, 15, 20, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--line)',
      padding: '12px 32px',
      position: 'sticky',
      top: 0,
      zIndex: 90,
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)'
    }}>
      
      {/* Esquerda: Identidade (Vila, Clan, Nome) */}
      <div className="flex-row" style={{ gap: '16px', alignItems: 'center' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '1px solid var(--seal-bright)',
          background: 'var(--ink-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {player.avatar ? (
            <img src={player.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '18px' }}>👤</span>
          )}
        </div>
        <div>
          <div className="gold mono uppercase" style={{ fontSize: '10px', letterSpacing: '1px' }}>
            Nível {player.level || 1} • {player.rank || 'Estudante'}
          </div>
          <div className="paper" style={{ fontFamily: 'Shippori Mincho', fontSize: '16px', fontWeight: 'bold' }}>
            {player.name}
          </div>
        </div>
      </div>

        <div className="flex-row" style={{ gap: '24px', alignItems: 'center' }}>
        
        {/* Kuro Coins */}
        <div className="flex-row" style={{ alignItems: 'center', gap: '8px', background: 'rgba(212,162,42,0.1)', border: '1px solid var(--gold)', borderRadius: '20px', padding: '4px 12px', marginRight: '16px' }}>
          <span style={{ fontSize: '14px' }}>🪙</span>
          <span className="gold mono" style={{ fontSize: '14px', fontWeight: 'bold' }}>{player.vip_coins || 0}</span>
        </div>

        {/* HP */}
        <div className="flex-col" style={{ gap: '4px', width: '140px' }}>
          <div className="flex-between">
            <span className="muted uppercase mono" style={{ fontSize: '9px', letterSpacing: '1px' }}>Saúde</span>
            <span className="mono" style={{ fontSize: '10px', color: '#ff4b4b' }}>{maxHp}/{maxHp}</span>
          </div>
          <div className="progress-track" style={{ height: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,75,75,0.2)', overflow: 'visible' }}>
            <div className="progress-fill red" style={{ width: `${hpPercent}%`, position: 'relative' }}>
              <img src="/images/imgi_8_heart.png" alt="HP" style={{ position: 'absolute', right: '-8px', top: '-6px', width: '20px' }} />
            </div>
          </div>
        </div>

        {/* Chakra */}
        <div className="flex-col" style={{ gap: '4px', width: '140px' }}>
          <div className="flex-between">
            <span className="muted uppercase mono" style={{ fontSize: '9px', letterSpacing: '1px' }}>Chakra</span>
            <span className="mono" style={{ fontSize: '10px', color: '#4b9eff' }}>{maxCp}/{maxCp}</span>
          </div>
          <div className="progress-track" style={{ height: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(75,158,255,0.2)', overflow: 'visible' }}>
            <div className="progress-fill blue" style={{ width: `${cpPercent}%`, position: 'relative' }}>
              <img src="/images/imgi_9_chakra.png" alt="CP" style={{ position: 'absolute', right: '-8px', top: '-6px', width: '20px' }} />
            </div>
          </div>
        </div>

        {/* Stamina */}
        <div className="flex-col" style={{ gap: '4px', width: '140px' }}>
          <div className="flex-between">
            <span className="muted uppercase mono" style={{ fontSize: '9px', letterSpacing: '1px' }}>Energia</span>
            <span className="mono gold" style={{ fontSize: '10px' }}>{maxSp}/{maxSp}</span>
          </div>
          <div className="progress-track" style={{ height: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,162,42,0.2)', overflow: 'visible' }}>
            <div className="progress-fill gold" style={{ width: `${spPercent}%`, position: 'relative' }}>
              <img src="/images/imgi_10_stamina.png" alt="SP" style={{ position: 'absolute', right: '-8px', top: '-6px', width: '20px' }} />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
