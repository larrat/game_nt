import React, { useState } from 'react';
import { Backpack, Menu, X } from 'lucide-react';
import { calculateHP, calculateChakra, calculateStamina, calculateXPForLevel, calculateLevelFromXP, getGlobalDebuffs } from '../utils/engine';
import InventoryModal from './InventoryModal';
import { getResourceProgress } from '../utils/resourceProgress';
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
  const hp = getResourceProgress(player.hp ?? maxHp, maxHp);
  const currentHp = hp.current;
  const hpPercent = hp.percent;

  const maxCp = calculateChakra(player);
  const chakra = getResourceProgress(player.chakra ?? maxCp, maxCp);
  const currentCp = chakra.current;
  const cpPercent = chakra.percent;

  const maxSp = calculateStamina(player);
  const stamina = getResourceProgress(player.stamina ?? maxSp, maxSp);
  const currentSp = stamina.current;
  const spPercent = stamina.percent;

  let xpPercent = 0;
  let currentXp = 0;
  let requiredXp = 100;
  if (player.xp !== undefined) {
    const currentLvl = calculateLevelFromXP(player.xp);
    const startXp = calculateXPForLevel(currentLvl);
    const nextLvlXp = calculateXPForLevel(currentLvl + 1);
    requiredXp = nextLvlXp - startXp;
    currentXp = player.xp - startXp;
    xpPercent = getResourceProgress(currentXp, requiredXp).percent;
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
          {mobileNavOpen ? <X size={20} strokeWidth={1.9} aria-hidden="true" /> : <Menu size={20} strokeWidth={1.9} aria-hidden="true" />}
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
            <progress
              className={'kuro-rpg-topbar__meter is-' + resource.tone}
              value={Math.max(0, Math.min(100, Number(resource.percent) || 0))}
              max={100}
              aria-label={resource.label}
              aria-valuetext={displayNumber(resource.current) + ' de ' + displayNumber(resource.max)}
            />
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
        ><Backpack size={19} strokeWidth={1.9} aria-hidden="true" /></button>
      </div>

      <InventoryModal isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        player={player}
        updatePlayer={updatePlayer}
      />
    </header>
  );
}
