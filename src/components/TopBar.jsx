import React, { useState } from 'react';
import { calculateHP, calculateChakra, calculateStamina, calculateXPForLevel, calculateLevelFromXP, getGlobalDebuffs } from '../utils/engine';
import InventoryModal from './InventoryModal';
import { supabase } from '../supabaseClient';
import { fetchActiveWorldBoss } from '../utils/eventUtils';

const VILLAGES = {
  1: 'Folha', 2: 'Areia', 3: 'Névoa',
  4: 'Pedra', 5: 'Nuvem', 6: 'Som', 7: 'Chuva', 8: 'Akatsuki'
};

export default function TopBar({ player, updatePlayer, onMenuClick, mobileNavOpen = false }) {
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

  // A regeneração é limitada pelo servidor a uma operação por minuto.
  React.useEffect(() => {
    if (!player || player.is_fainted) return;
    let cancelled = false;

    const regenerate = async () => {
      try {
        const { data, error } = await supabase.rpc('regenerar_recursos_jogador', {
          p_player_id: player.id
        });

        if (error) {
          console.error('Erro na regeneração de recursos:', error);
          return;
        }

        if (!cancelled && data?.success && data?.regenerated && updatePlayer) {
          await updatePlayer(player.id);
        }
      } catch (error) {
        console.error('Erro inesperado na regeneração de recursos:', error);
      }
    };

    const interval = setInterval(regenerate, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [player?.id, player?.is_fainted, updatePlayer]);

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

  const resources = [
    { id: 'hp', label: 'Vida', icon: '/images/imgi_98_heart.png', current: currentHp, max: maxHp, percent: hpPercent, tone: 'red' },
    { id: 'chakra', label: 'Chakra', icon: '/images/imgi_99_chakra.png', current: currentCp, max: maxCp, percent: cpPercent, tone: 'blue' },
    { id: 'stamina', label: 'Stamina', icon: '/images/imgi_100_stamina.png', current: currentSp, max: maxSp, percent: spPercent, tone: isCursed ? 'purple' : 'yellow' },
    { id: 'xp', label: 'Experiência', icon: '/images/imgi_32_star.png', current: currentXp, max: requiredXp, percent: xpPercent, tone: 'green' }
  ];
  const displayNumber = (value) => Math.max(0, Number(value) || 0).toLocaleString('pt-BR');

  return (
    <header className="topbar-wrapper kuro-rpg-topbar" aria-label="Dados do personagem">
      <div className="kuro-rpg-topbar__identity topbar-identity-group">
        <button
          type="button"
          className="mobile-nav-toggle"
          aria-label={mobileNavOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileNavOpen}
          onClick={onMenuClick}
          title={mobileNavOpen ? 'Fechar navegação' : 'Abrir navegação'}
        >
          <span aria-hidden="true">{mobileNavOpen ? '×' : '☰'}</span>
        </button>
        <div className="topbar-avatar kuro-rpg-topbar__portrait">
          {player.avatar?.startsWith('/') ?
            <img src={player.avatar} alt="" /> :
            <span aria-hidden="true">忍</span>}
        </div>
        <div className="kuro-rpg-topbar__name">
          <span className="kuro-rpg-topbar__village">{VILLAGES[player.village_id] || 'Nukenin'} · {player.rank || 'Estudante da Academia'}</span>
          <strong>{player.name}</strong>
          <span className="kuro-rpg-topbar__level">NÍVEL {calculateLevelFromXP(player.xp || 0)}</span>
        </div>
      </div>

      <div className="kuro-rpg-topbar__resources" aria-label="Vida, chakra, stamina e experiência">
        {resources.map(resource => (
          <div key={resource.id} className={'kuro-rpg-topbar__resource is-' + resource.tone}>
            <div className="kuro-rpg-topbar__resource-line">
              <img src={resource.icon} alt="" width="16" height="16" />
              <span>{resource.label}</span>
              <strong>{displayNumber(resource.current)} <span>/ {displayNumber(resource.max)}</span></strong>
            </div>
            <div
              className="topbar-stat-bar-bg kuro-rpg-topbar__meter"
              role="progressbar"
              aria-label={resource.label}
              aria-valuemin={0}
              aria-valuemax={Math.max(1, Number(resource.max) || 1)}
              aria-valuenow={Math.max(0, Math.min(Number(resource.current) || 0, Math.max(1, Number(resource.max) || 1)))}
            >
              <div className={'topbar-stat-bar-fill ' + resource.tone}
                style={{ width: resource.percent + '%' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="kuro-rpg-topbar__wallet">
        <div className={'kuro-rpg-topbar__currency' + (ryousFlash ? ' is-updated' : '')} title="Ryous">
          <img src="/images/imgi_110_ryous.png" alt="" width="18" height="18" />
          <span className="kuro-rpg-topbar__currency-type">RYOUS</span>
          <strong>{displayNumber(player.ryous)}</strong>
        </div>
        <div className="kuro-rpg-topbar__currency" title="Kuro Coins">
          <img src="/images/imgi_88_vip.png" alt="" width="18" height="18" />
          <span className="kuro-rpg-topbar__currency-type">COINS</span>
          <strong>{displayNumber(player.vip_coins)}</strong>
        </div>
        <button
          type="button"
          className="btn-attr kuro-rpg-topbar__inventory"
          onClick={() => setIsInventoryOpen(true)}
          aria-label="Abrir inventário"
          title="Abrir inventário"
        >🎒</button>
      </div>

      <InventoryModal isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        player={player}
        updatePlayer={updatePlayer}
      />
    </header>
  );
}
