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

  // Regen passivo de HP/Chakra/Stamina a cada 60 segundos
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
      const newH = Math.min(maxH, cH + Math.max(1, Math.floor(maxH * 0.4)));
      const newC = Math.min(maxC, cC + Math.max(1, Math.floor(maxC * 0.4)));
      const newS = Math.min(maxS, cS + Math.max(1, Math.floor(maxS * 0.4)));
      await supabase.from('players').update({ hp: newH, chakra: newC, stamina: newS }).eq('id', player.id);
      if (updatePlayer) updatePlayer(player.id);
    }, 60000);
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

  const debuffs = getGlobalDebuffs(activeEvent);
  const isCursed = debuffs.staminaCostMultiplier > 1;

  return (
    <div className="topbar-wrapper">
      
      {/* Esquerda: Identidade (Vila, Clan, Nome) */}
      <div className="flex-row">
        <div className="topbar-avatar">
          {player.avatar?.startsWith('/') ? (
            <img src={player.avatar} alt="Avatar" />
          ) : (
            <img src={`https://placehold.co/100x100/1c1c22/b3232d?text=${player.name?.charAt(0)}`} alt="Avatar" />
          )}
        </div>
        
        <div className="flex-col gap-1">
          <div className="flex-row gap-2">
            <span className="mono gold text-xs uppercase">{VILLAGES[player.village_id] || 'Nukenin'}</span>
            <span className="mono muted text-xs uppercase">{player.clan || 'Sem Clã'}</span>
          </div>
          <div className="flex-row gap-2">
            <span className="text-paper font-bold text-[15px] tracking-wide">{player.name}</span>
            <span className="badge badge-muted px-1.5 py-0.5 text-[10px]">Nv {calculateLevelFromXP(player.xp)}</span>
          </div>
        </div>
      </div>

      {/* Centro: Barras de Status Pessoais */}
      <div className="flex-row gap-6">
        
        {/* HP */}
        <div className="topbar-stat-container" title={`HP: ${currentHp} / ${maxHp}`}>
          <img src="/images/imgi_98_heart.png" alt="HP" className="topbar-stat-icon" />
          <div className="topbar-stat-bar-bg">
            <div className="topbar-stat-bar-fill red" style={{ width: `${hpPercent}%` }} />
          </div>
        </div>

        {/* Chakra */}
        <div className="topbar-stat-container" title={`Chakra: ${currentCp} / ${maxCp}`}>
          <img src="/images/imgi_99_chakra.png" alt="CP" className="topbar-stat-icon" />
          <div className="topbar-stat-bar-bg">
            <div className="topbar-stat-bar-fill blue" style={{ width: `${cpPercent}%` }} />
          </div>
        </div>

        {/* Stamina */}
        <div className="topbar-stat-container" title={`Stamina: ${currentSp} / ${maxSp}`}>
          <img src="/images/imgi_100_stamina.png" alt="SP" className="topbar-stat-icon" style={{ filter: isCursed ? 'hue-rotate(240deg) saturate(2)' : 'none' }} />
          <div className="topbar-stat-bar-bg">
            <div className="topbar-stat-bar-fill yellow" style={{ width: `${spPercent}%`, filter: isCursed ? 'hue-rotate(240deg) saturate(2)' : 'none' }} />
          </div>
        </div>

        {/* XP */}
        <div className="topbar-stat-container" title={`XP: ${currentXp} / ${requiredXp}`}>
          <img src="/images/imgi_32_star.png" alt="XP" className="topbar-stat-icon" />
          <div className="topbar-stat-bar-bg">
            <div className="topbar-stat-bar-fill green" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Direita: Economia e Ações */}
      <div className="flex-row gap-6">
        
        {/* Ryous */}
        <div 
          className="flex-row gap-2 px-3 py-1 rounded border border-line-bright transition-colors duration-300"
          style={{ 
            backgroundColor: ryousFlash ? 'rgba(212, 162, 42, 0.3)' : 'var(--ink-card)'
          }}
          title="Ryous (Dinheiro)"
        >
          <img src="/images/imgi_110_ryous.png" alt="Ryous" className="w-[18px] h-[18px]" />
          <span className="font-mono text-gold text-[13px] font-semibold">
            {player.ryous?.toLocaleString() || 0}
          </span>
        </div>
        
        <div 
          className="flex-row gap-2 bg-ink-card px-3 py-1 rounded border border-line-bright"
          title="VIP Coins"
        >
          <img src="/images/imgi_88_vip.png" alt="VIP Coins" className="w-[18px] h-[18px]" />
          <span className="font-mono text-muted-bright text-[13px] font-semibold">
            {player.vip_coins?.toLocaleString() || 0}
          </span>
        </div>

        <button 
          className="btn-attr w-9 h-9 p-0 flex items-center justify-center"
          onClick={() => setIsInventoryOpen(true)}
          title="Abrir Inventário (Mochila)"
        >
          🎒
        </button>
      </div>

      <InventoryModal 
        isOpen={isInventoryOpen} 
        onClose={() => setIsInventoryOpen(false)} 
        player={player} 
        updatePlayer={updatePlayer}
      />
    </div>
  );
}
