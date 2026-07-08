import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { calculateHP, calculateChakra, calculateStamina, calculateAtkTaiBuk, calculateDefTaiBuk, getPvPMatchRules, generateDynamicRogueNinja, getDynamicNpcJutsus, calculateLevelFromXP } from '../utils/engine';
import { rollRarity, generateLootStats } from '../utils/lootEngine';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';
import { useGameConfig } from '../context/GameConfigContext';

export default function Dojo({ player }) {
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);
  const { addToast } = useToast();
  const gameConfig = useGameConfig();

  useEffect(() => {
    if (player && player.is_fainted) {
      navigate('/hospital');
    }
  }, [player, navigate]);

  if (!player) return null;

  const fetchRivalJutsus = async (rivalId) => {
    const { data: rival } = await supabase
      .from('players')
      .select('jutsus_learned')
      .eq('id', rivalId)
      .single();

    const learned = Array.isArray(rival?.jutsus_learned) ? rival.jutsus_learned : [];
    const ids = learned.map(j => typeof j === 'string' ? j : j.id).filter(Boolean);
    if (!ids.length) return [];

    const { data } = await supabase
      .from('jutsus')
      .select('*, jutsu_effects(*, status_effects(*))')
      .in('id', ids);

    return data || [];
  };

  const handleSearch = async () => {
    setLoadingId('search');
    await new Promise(r => setTimeout(r, 2000));
    
    const roll = Math.random();
    
    // A pedido do usuário, o sistema de espelho (PvP no Dojo) foi desativado temporariamente
    // para focar na criação de NPCs perfeitamente parelhos (paralelos) com os status do jogador.
    
    // 1) Checa se existe NPC da História disponível no banco
    const npcChance = Number(gameConfig?.dojo_story_npc_chance) || 0.35;
    if (roll < npcChance) {
      const { data: dojoNpcs } = await supabase
        .from('npcs')
        .select('*')
        .eq('is_map_npc', false)
        .lte('level', player.level + 5);

      if (dojoNpcs && dojoNpcs.length > 0) {
        const chosenNPC = dojoNpcs[Math.floor(Math.random() * dojoNpcs.length)];
        chosenNPC.activeJutsus = getDynamicNpcJutsus(chosenNPC);
        setLoadingId(null);
        return navigate('/combate', { state: { bgType: 'dojo', npc: chosenNPC, isMirror: false } });
      }
    }

    // 2) Fallback para Gerar Ninja Renegado Dinâmico Parelho
    // Simulamos um IsMirror para garantir que as fórmulas de Combate usem os atributos recém gerados!
    const rogue = generateDynamicRogueNinja(player);
    setLoadingId(null);
    return navigate('/combate', { state: { bgType: 'dojo', npc: rogue, isMirror: true } });
  };

  const handleBetrayal = async () => {
    setLoadingId('betray');
    await new Promise(r => setTimeout(r, 2000));

    const rules = getPvPMatchRules(player.rank, player.level);

    let query = supabase
      .from('players')
      .select('*')
      .neq('id', player.id)
      .eq('village_id', player.village_id)
      .gte('level', rules.minLvl)
      .lte('level', rules.maxLvl)
      .limit(5);

    if (rules.targetRanks && rules.targetRanks.length > 0) {
      query = query.in('rank', rules.targetRanks);
    }

    const { data: targets } = await query;

    setLoadingId(null);

    if (targets && targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)];
      const targetJutsus = await fetchRivalJutsus(target.id);

      const mirrorNpc = {
        id: `rival_${target.id}`,
        real_id: target.id,
        name: target.name,
        avatar: target.avatar || '👤',
        level: target.level,
        hp: calculateHP(target),
        chakra: calculateChakra(target),
        atk: calculateAtkTaiBuk(target),
        def: calculateDefTaiBuk(target),
        element: target.element,
        activeJutsus: targetJutsus,
        xpReward: Math.floor((target.level * 100) + 200),
        ryouReward: Math.floor((target.level * 50) + 100),
        desc: 'Você está prestes a cometer alta traição contra um companheiro de vila!'
      };
      
      return navigate('/combate', { state: { bgType: 'dojo', npc: mirrorNpc, isMirror: true, isBetrayal: true } });
    } else {
      addToast('Não há membros de sua vila por perto no momento para trair.', 'info');
    }
  };

  const handleBijuuHunt = async () => {
    setLoadingId('hunt');
    await new Promise(r => setTimeout(r, 2000));

    // Busca Jinchuurikis (tem_bijuu = true)
    const { data: targets } = await supabase
      .from('players')
      .select('*')
      .neq('id', player.id)
      .eq('has_bijuu', true)
      .limit(5);

    setLoadingId(null);

    if (targets && targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)];
      const mirrorNpc = {
        id: `bijuu_${target.id}`,
        real_id: target.id,
        name: target.name + ' (Jinchuuriki)',
        avatar: target.avatar || '👤',
        level: target.level + 5, // Jinchuurikis são buffados no pvp assimétrico
        hp: calculateHP(target) * (Number(gameConfig?.bijuu_hp_mult) || 2.0), // Multiplicador de HP
        chakra: calculateChakra(target) * (Number(gameConfig?.bijuu_chakra_mult) || 3.0),
        atk: calculateAtkTaiBuk(target) * 1.5,
        def: calculateDefTaiBuk(target) * 1.5,
        element: target.element,
        xpReward: Math.floor((target.level * 300) + 500),
        ryouReward: Math.floor((target.level * 150) + 300),
        desc: 'Você rastreou uma Bijuu! Extraia o chakra para a Akatsuki!',
        isBijuuHunt: true
      };
      
      return navigate('/combate', { state: { bgType: 'dojo', npc: mirrorNpc, isMirror: true, isBijuuHunt: true } });
    } else {
      addToast('O radar da Akatsuki não encontrou nenhum Jinchuuriki no momento.', 'info');
    }
  };

  const RAID_STAMINA_COST = 25;

  const handleRaid = async (fightCount) => {
    const totalCost = fightCount * RAID_STAMINA_COST;
    const currentSt = player.stamina ?? calculateStamina(player);

    if (currentSt < totalCost) {
      addToast(`Incursão de ${fightCount}x requer ${totalCost} Stamina (você tem ${currentSt}).`, 'error');
      return;
    }

    setLoadingId('raid');
    await new Promise(r => setTimeout(r, 1200));

    const rogue = generateDynamicRogueNinja(player);
    const { error } = await supabase
      .from('players')
      .update({ stamina: currentSt - totalCost })
      .eq('id', player.id);

    setLoadingId(null);

    if (error) {
      addToast('Erro ao iniciar incursão: ' + error.message, 'error');
      return;
    }

    navigate('/combate', {
      state: {
        bgType: 'dojo',
        npc: rogue,
        isMirror: true,
        raidTotal: fightCount,
        raidCurrent: 1
      }
    });
  };

  const handleQuickClear = async (fightCount) => {
    const totalCost = fightCount * RAID_STAMINA_COST;
    const currentSt = player.stamina ?? calculateStamina(player);

    if (currentSt < totalCost) {
      addToast(`Limpeza Rápida de ${fightCount}x requer ${totalCost} Stamina (você tem ${currentSt}).`, 'error');
      return;
    }

    setLoadingId(`quick_${fightCount}`);
    await new Promise(r => setTimeout(r, 600));

    let totalXp = 0;
    let totalRyous = 0;
    let wins = 0;
    let losses = 0;

    for (let i = 0; i < fightCount; i++) {
        // Chance base de 85% de vitória para simular a dificuldade de enfrentar Jounins escalados
        if (Math.random() <= 0.85) {
            totalXp += Math.floor((player.level * 40) + 150);
            totalRyous += Math.floor((player.level * 25) + 80);
            wins++;
        } else {
            losses++;
        }
    }
    
    // Variance
    if (wins > 0) {
        totalXp = Math.floor(totalXp * (0.9 + Math.random() * 0.2));
        totalRyous = Math.floor(totalRyous * (0.9 + Math.random() * 0.2));
    }

    const finalXp = player.xp + totalXp;
    const newLevel = calculateLevelFromXP(finalXp);
    const levelsGained = Math.max(0, newLevel - player.level);
    const newPoints = (player.pontos_atributos || 0) + (levelsGained * 3);

    let kuroCoinsDrop = 0;
    let equipmentDrops = 0;
    let essenceDrops = 0;
    let newEssences = { ...(player.inventory_essences || {}) };
    let equipmentInserts = [];

    // Simulate Drops for each win
    if (wins > 0) {
      for (let w = 0; w < wins; w++) {
        // 1. Kuro Coins (2% chance)
        if (Math.random() <= 0.02) kuroCoinsDrop++;
        
        // 2. Equipments (25% chance in Dojo)
        if (Math.random() <= 0.25) {
          const { data: baseItems } = await supabase.from('items').select('*');
          if (baseItems && baseItems.length > 0) {
            const randomBaseItem = baseItems[Math.floor(Math.random() * baseItems.length)];
            const rarity = await rollRarity(player.rank || 'Genin');
            const rolledStats = await generateLootStats(rarity, player.rank || 'Genin', '');
            equipmentInserts.push({
              player_id: player.id,
              item_id: randomBaseItem.id,
              is_equipped: false,
              is_favorite: false,
              rarity: rarity,
              rolled_stats: rolledStats
            });
            equipmentDrops++;
          }
        }

        // 3. Essences (15% chance in Dojo)
        if (Math.random() <= 0.15) {
          const rankToTier = { 'Estudante da Academia': 1, 'Genin': 1, 'Chunin': 2, 'Jounin': 3, 'ANBU': 4, 'Sannin': 4, 'Herói': 5 };
          const tier = rankToTier[player.rank] || 1;
          const essenceTypes = ['dano', 'custo', 'letalidade', 'protecao'];
          const randomType = essenceTypes[Math.floor(Math.random() * essenceTypes.length)];
          const essenceKey = `${randomType}_${tier}`;
          newEssences[essenceKey] = (newEssences[essenceKey] || 0) + 1;
          essenceDrops++;
        }
      }
    }

    const playerUpdates = {
        stamina: currentSt - totalCost,
        xp: finalXp,
        level: newLevel,
        pontos_atributos: newPoints,
        ryous: player.ryous + totalRyous,
        wins_dojo: (player.wins_dojo || 0) + wins,
        dojo_clears: (player.dojo_clears || 0) + wins
    };
    if (kuroCoinsDrop > 0) playerUpdates.vip_coins = (player.vip_coins || 0) + kuroCoinsDrop;
    if (essenceDrops > 0) playerUpdates.inventory_essences = newEssences;

    const { error } = await supabase.from('players').update(playerUpdates).eq('id', player.id);

    if (equipmentInserts.length > 0) {
       await supabase.from('player_inventory').insert(equipmentInserts);
    }

    setLoadingId(null);

    if (error) {
      addToast('Erro na limpeza rápida: ' + error.message, 'error');
      return;
    }

    let dropMsg = '';
    if (equipmentDrops > 0) dropMsg += ` | ⚔️ ${equipmentDrops} Equipamentos`;
    if (essenceDrops > 0) dropMsg += ` | 📜 ${essenceDrops} Essências`;
    if (kuroCoinsDrop > 0) dropMsg += ` | 🪙 ${kuroCoinsDrop} Kuro Coins`;

    if (wins === 0) {
      addToast(`⚡ A Limpeza Rápida falhou! Você perdeu todas as ${losses} lutas.`, 'error');
    } else if (losses > 0) {
      addToast(`⚡ Limpeza Parcial! Venceu ${wins} e Perdeu ${losses}. +${totalXp} XP | +${totalRyous} Ryous${dropMsg}`, 'info');
    } else {
      addToast(`⚡ Limpeza Rápida Perfeita! Venceu todas as ${wins} lutas. +${totalXp} XP | +${totalRyous} Ryous${dropMsg}`, 'success');
    }
    if (levelsGained > 0) {
      addToast(`🎉 Você subiu ${levelsGained} Níveis!`, "success");
    }
    await updatePlayer(player.user_id);
  };


  const handleFreeTraining = () => {
    const dummyNPC = {
      id: 'dummy',
      name: 'Boneco de Madeira',
      avatar: '🪵',
      level: 1,
      hp: 9999,
      chakra: 0,
      atk: 0,
      def: 0,
      element: null,
      xpReward: 0,
      ryouReward: 0,
      desc: 'Teste de Dano. O boneco não ataca de volta nem dá experiência.',
      is_dummy: true
    };
    navigate('/combate', { state: { bgType: 'dojo', npc: dummyNPC, isMirror: false, fromDojoFree: true } });
  };

  const isAkatsuki = player.village_id === 8;

  return (
    <div className="page">
      <PageHeader
        eyebrow='Treinamento e Combate'
        title='Dojo da Vila'
        subtitle='Escolha entre teste seguro, combate real e objetivos de risco.'
      />

      <div className="element-summary">
        <div className="summary-tile">
          <div className="label">Seu nível</div>
          <div className="value">Nv. {player.level}</div>
        </div>
        <div className="summary-tile">
          <div className="label">Graduação</div>
          <div className="value">{player.rank || 'Estudante'}</div>
        </div>
        <div className="summary-tile">
          <div className="label">Estado</div>
          <div className="value">{loadingId ? 'Rastreando...' : 'Disponível'}</div>
        </div>
      </div>

      <div className="action-grid">
        <section className="action-card">
          <div className="action-card-icon">🪵</div>
          <h3>Treinamento Livre</h3>
          <p>Use um alvo sem risco para testar dano, jutsus e equipamentos. Não concede recompensas.</p>
          <div className="meta-row">
            <span className="badge badge-green">Seguro</span>
            <span className="badge badge-muted">Sem custo</span>
          </div>
          <button className="btn-ghost w-full" onClick={handleFreeTraining} disabled={loadingId !== null}>
            Bater no Boneco
          </button>
        </section>

        <section className="action-card featured">
          <div className="action-card-icon">⚔️</div>
          <h3>Combate Real</h3>
          <p>Rastreia um instrutor ou oponente parelho para uma luta completa com risco e progressão.</p>
          <div className="meta-row">
            <span className="badge badge-gold">Recomendado</span>
            <span className="badge badge-muted">NPC ou rival</span>
          </div>
          <button className="btn-primary w-full" onClick={handleSearch} disabled={loadingId !== null}>
            <span>{loadingId === 'search' ? 'Rastreando...' : 'Procurar Luta'}</span>
            <div className="stamp"></div>
          </button>
        </section>

        <section className="action-card">
          <div className="action-card-icon">⚡</div>
          <h3>Incursão (Raid)</h3>
          <p>Lute várias vezes seguidas sem sair do combate. Custa Stamina antecipada — recompensas acumulam a cada vitória.</p>
          <div className="meta-row">
            <span className="badge badge-gold">{RAID_STAMINA_COST} ST/luta</span>
            <span className="badge badge-muted">Stamina: {player.stamina ?? calculateStamina(player)}</span>
          </div>
          <div className="flex-col gap-sm w-full">
            <div className="flex-row gap-sm w-full">
              <button className="btn-ghost flex-1" onClick={() => handleRaid(3)} disabled={loadingId !== null}>
                Raid 3x
              </button>
              <button className="btn-primary flex-1" onClick={() => handleRaid(5)} disabled={loadingId !== null}>
                <span>{loadingId === 'raid' ? '...' : 'Raid 5x'}</span>
              </button>
            </div>
            {(player.dojo_clears || player.wins_dojo || 0) >= 3 && (
              <div className="flex-row gap-sm w-full">
                <button className="btn-ghost flex-1 text-gold border-gold" onClick={() => handleQuickClear(3)} disabled={loadingId !== null}>
                  ⚡ Limpar 3x
                </button>
                <button className="btn-ghost flex-1 text-gold border-gold" onClick={() => handleQuickClear(5)} disabled={loadingId !== null}>
                  ⚡ Limpar 5x
                </button>
              </div>
            )}
          </div>
        </section>

        <section className={`action-card ${isAkatsuki ? 'featured' : 'danger-zone'}`}>
          <div className="action-card-icon">{isAkatsuki ? '☁️' : '⛔'}</div>
          <h3>{isAkatsuki ? 'Caçada Jinchuuriki' : 'Renegado'}</h3>
          <p>
            {isAkatsuki
              ? 'Rastreie portadores de Bijuus para cumprir os objetivos da organização. Alvos são extremamente perigosos.'
              : 'Ataque um companheiro de vila. Se vencer, você rasga a bandana e entra para a Akatsuki.'}
          </p>
          <div className="meta-row">
            <span className={`badge ${isAkatsuki ? 'badge-gold' : 'badge-red'}`}>{isAkatsuki ? 'Objetivo' : 'Permanente'}</span>
            <span className="badge badge-muted">Alto risco</span>
          </div>
          <button
            className={`w-full ${isAkatsuki ? 'btn-primary' : 'btn-danger'}`}
            onClick={isAkatsuki ? handleBijuuHunt : handleBetrayal}
            disabled={loadingId !== null}
          >
            <span>
              {isAkatsuki
                ? (loadingId === 'hunt' ? 'Rastreando...' : 'Caçar Jinchuuriki')
                : (loadingId === 'betray' ? 'Rastreando...' : 'Trair a Vila')}
            </span>
            {isAkatsuki && <div className="stamp"></div>}
          </button>
        </section>
      </div>

      <div className="info-banner mt-6">
        <strong className="paper">Dica:</strong> use o Treinamento Livre depois de trocar equipamentos ou jutsus. Para progressão real, vá em Combate Real.
      </div>
    </div>
  );
}
