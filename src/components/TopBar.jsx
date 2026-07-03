import React, { useState } from 'react';
import { calculateHP, calculateChakra, calculateStamina, calculateXPForLevel, calculateLevelFromXP, getGlobalDebuffs } from '../utils/engine';
import InventoryModal from './InventoryModal';
import { supabase } from '../supabaseClient';
import { fetchActiveWorldBoss } from '../utils/eventUtils';

const VILLAGES = {
  1: 'Folha', 2: 'Areia', 3: 'Névoa',
  4: 'Pedra', 5: 'Nuvem', 6: 'Som', 7: 'Chuva', 8: 'Akatsuki'
};

export default function TopBar({ player, updatePlayer }) {
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [ryousFlash, setRyousFlash] = useState(false);
  const [prevRyous, setPrevRyous] = useState(player?.ryous || 0);
  const [activeEvent, setActiveEvent] = useState(null);

  React.useEffect(() => {
    async function fetchEvent() {
      const data = await fetchActiveWorldBoss(supabase);
      setActiveEvent(data);
    }
    fetchEvent();
  }, []);

  React.useEffect(() => {
    if (player && player.ryous > prevRyous) {
      setRyousFlash(true);
      setTimeout(() => setRyousFlash(false), 1000);
    }
    setPrevRyous(player?.ryous || 0);
  }, [player?.ryous]);

  // Regen passivo de HP/Chakra/Stamina a cada 15 segundos
  React.useEffect(() => {
    if (!player || player.is_fainted) return;
    const interval = setInterval(async () => {
      const maxH = calculateHP(player);
      const maxC = calculateChakra(player);
      const maxS = calculateStamina(player);
      const cH = player.hp ?? maxH;
      const cC = player.chakra ?? maxC;
      const cS = player.stamina ?? maxS;
      if (cH >= maxH && cC >= maxC && cS >= maxS) return;
      const newH = Math.min(maxH, cH + Math.max(1, Math.floor(maxH * 0.1)));
      const newC = Math.min(maxC, cC + Math.max(1, Math.floor(maxC * 0.1)));
      const newS = Math.min(maxS, cS + Math.max(1, Math.floor(maxS * 0.1)));
      await supabase.from('players').update({ hp: newH, chakra: newC, stamina: newS }).eq('id', player.id);
      if (updatePlayer) updatePlayer();
    }, 15000);
    return () => clearInterval(interval);
  }, [player?.id, player?.hp, player?.chakra, player?.stamina]);

  if (!player) return null;

  const maxHp = calculateHP(player);
  const currentHp = player.hp !== undefined && player.hp !== null ? Math.min(player.hp, maxHp) : maxHp;
  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

  const maxCp = calculateChakra(player);
  const currentCp = player.chakra !== undefined && player.chakra !== null ? Math.min(player.chakra, maxCp) : maxCp;
  const cpPercent = Math.max(0, Math.min(100, (currentCp / maxCp) * 100));

  const maxSp = calculateStamina(player);
  const currentSp = player.stamina !== undefined && player.stamina !== null ? Math.min(player.stamina, maxSp) : maxSp;
  const spPercent = Math.max(0, Math.min(100, (currentSp / maxSp) * 100));

  let xpPercent = 0;
  let currentXp = 0;
  let requiredXp = 100;
  if (player.xp !== undefined) {
    const currentLvl = calculateLevelFromXP(player.xp);
    const startXp = calculateXPForLevel(currentLvl);
    const nextLvlXp = calculateXPForLevel(currentLvl + 1);
    requiredXp = nextLvlXp - startXp;
    currentXp = player.xp - startXp;
    xpPercent = Math.min(100, Math.max(0, (currentXp / requiredXp) * 100));
  }

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
          <div className="gold mono uppercase" style={{ fontSize: '10px', letterSpacing: '1px', marginBottom: '2px' }}>
            Nível {player.level || 1} • {player.rank || 'Estudante'} • Vila da {VILLAGES[player.village_id]}
          </div>
          <div className="flex-between" style={{ alignItems: 'baseline', marginBottom: '3px' }}>
            <div className="paper" style={{ fontFamily: 'Shippori Mincho', fontSize: '16px', fontWeight: 'bold' }}>
              {player.name}
            </div>
            <div className="mono" style={{ fontSize: '9px', color: '#4ade80', whiteSpace: 'nowrap', marginLeft: '8px' }}>
              {currentXp.toLocaleString()} / {requiredXp.toLocaleString()} XP ({Math.floor(xpPercent)}%)
            </div>
          </div>
          <div className="progress-track" style={{ height: '4px', width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--line-bright)' }}>
            <div className="progress-fill green" style={{ width: `${xpPercent}%`, transition: 'width 0.5s ease' }}></div>
          </div>
        </div>
      </div>

      <div className="flex-row" style={{ gap: '24px', alignItems: 'center' }}>
        
        {/* Ryous & Kuro Coins */}
        <div className="flex-row" style={{ 
          alignItems: 'center', gap: '12px', background: 'rgba(212,162,42,0.1)', border: '1px solid var(--gold)', borderRadius: '20px', padding: '4px 16px',
          boxShadow: ryousFlash ? '0 0 15px var(--gold)' : 'none',
          transform: ryousFlash ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.3s ease'
        }}>
          <div className="flex-row" style={{ alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '14px' }}>💴</span>
            <span className="mono" style={{ fontSize: '12px', color: ryousFlash ? '#4ade80' : 'var(--paper)', transition: 'color 0.3s' }}>{player.ryous || 0}</span>
          </div>
          <div style={{ width: '1px', height: '12px', background: 'var(--gold)', opacity: 0.5 }}></div>
          <div className="flex-row" style={{ alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '14px' }}>🪙</span>
            <span className="gold mono" style={{ fontSize: '12px', fontWeight: 'bold' }}>{player.vip_coins || 0}</span>
          </div>
        </div>

        {/* HP */}
        <div className="flex-col" style={{ gap: '4px', width: '140px' }}>
          <div className="flex-between">
            <span className="muted uppercase mono" style={{ fontSize: '9px', letterSpacing: '1px' }}>Saúde</span>
            <span className="mono" style={{ fontSize: '10px', color: '#ff4b4b' }}>{currentHp}/{maxHp}</span>
          </div>
          <div className="progress-track" style={{ height: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,75,75,0.2)', overflow: 'visible' }}>
            <div className="progress-fill red" style={{ width: `${hpPercent}%`, position: 'relative', transition: 'width 0.5s ease' }}>
              <img src="/images/imgi_8_heart.png" alt="HP" style={{ position: 'absolute', right: '-8px', top: '-6px', width: '20px' }} />
            </div>
          </div>
        </div>

        {/* Chakra */}
        <div className="flex-col" style={{ gap: '4px', width: '140px' }}>
          <div className="flex-between">
            <span className="muted uppercase mono" style={{ fontSize: '9px', letterSpacing: '1px' }}>Chakra</span>
            <span className="mono" style={{ fontSize: '10px', color: '#4b9eff' }}>{currentCp}/{maxCp}</span>
          </div>
          <div className="progress-track" style={{ height: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(75,158,255,0.2)', overflow: 'visible' }}>
            <div className="progress-fill blue" style={{ width: `${cpPercent}%`, position: 'relative', transition: 'width 0.5s ease' }}>
              <img src="/images/imgi_9_chakra.png" alt="CP" style={{ position: 'absolute', right: '-8px', top: '-8px', width: '20px' }} />
            </div>
          </div>
        </div>

        {/* Stamina */}
        <div className="flex-col" style={{ gap: '4px', width: '140px' }}>
          <div className="flex-between">
            <span className="muted uppercase mono" style={{ fontSize: '9px', letterSpacing: '1px' }}>Energia</span>
            <span className="mono gold" style={{ fontSize: '10px' }}>{currentSp}/{maxSp}</span>
          </div>
          <div className="progress-track" style={{ height: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,162,42,0.2)', overflow: 'visible' }}>
            <div className="progress-fill gold" style={{ width: `${spPercent}%`, position: 'relative', transition: 'width 0.5s ease' }}>
              <img src="/images/imgi_10_stamina.png" alt="SP" style={{ position: 'absolute', right: '-8px', top: '-6px', width: '20px' }} />
            </div>
          </div>
        </div>

        {/* Mochila / Inventário Rápido */}
        <div onClick={() => setIsInventoryOpen(true)} style={{ marginLeft: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--ink-raised)', border: '1px solid var(--line-bright)', transition: 'all 0.2s' }} title="Inventário de Consumíveis">
          <span style={{ fontSize: '16px' }}>🎒</span>
        </div>

      </div>

    <InventoryModal isOpen={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} player={player} updatePlayer={updatePlayer} />
      {/* Tracker de Evento e Debuffs - Slim Banner */}
      {activeEvent && activeEvent.is_world_boss && (
        <div style={{
          position: 'absolute', bottom: '-28px', left: 0, right: 0,
          background: 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.15) 20%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.15) 80%, transparent)', 
          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--danger)',
          padding: '4px 16px',
          fontSize: '11px', fontWeight: 'bold', display: 'flex', gap: '24px', justifyContent: 'center', alignItems: 'center',
          backdropFilter: 'blur(4px)',
          zIndex: -1,
          animation: 'pulseGlow 2s infinite alternate'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            <span style={{ fontSize: '14px', filter: 'drop-shadow(0 0 4px red)' }}>🦊</span> {activeEvent.name} Ativo
          </span>
          {(() => {
            const debuffs = getGlobalDebuffs(activeEvent);
            const activeTags = [];
            if (debuffs.staminaCostMultiplier > 1) activeTags.push(`Stamina x${debuffs.staminaCostMultiplier}`);
            if (debuffs.accuracyPenalty > 0) activeTags.push(`Precisão -${debuffs.accuracyPenalty}%`);
            if (debuffs.hospitalCostMultiplier > 1) activeTags.push(`Hospital x${debuffs.hospitalCostMultiplier}`);
            if (debuffs.ryouGainMultiplier < 1) activeTags.push(`Ryous x${debuffs.ryouGainMultiplier}`);
            
            if (activeTags.length === 0) return null;
            return (
              <span style={{ display: 'flex', gap: '12px', opacity: 0.9 }}>
                {activeTags.map((t,i) => (
                  <span key={i} className="mono" style={{ color: 'var(--paper)', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                    • {t}
                  </span>
                ))}
              </span>
            );
          })()}
        </div>
      )}
      <style>{`
        @keyframes pulseGlow {
          0% { box-shadow: inset 0 -5px 15px -10px rgba(239,68,68,0); }
          100% { box-shadow: inset 0 -5px 15px -10px rgba(239,68,68,0.8); }
        }
      `}</style>
    </div>
  );
}
