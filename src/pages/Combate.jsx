import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import JutsuIcon from '../components/JutsuIcon';
import '../styles/main.css';

import {
  calculateLevelFromXP,
  calculateHP,
  calculateChakra,
  calculateStamina,
  calculateAtkTaiBuk,
  calculateAtkNinGen,
  calculateDefTaiBuk,
  calculateDefNinGen,
  calculateCritChance,
  calculateDodgeChance,
  calculateChakraDiscount,
  getElementalMultiplier,
  getGlobalDebuffs,
  getJutsuEnhancementBonus,
  scaleStoryNPC
} from '../utils/engine';
import { rollRarity, generateLootStats } from '../utils/lootEngine';
import PageHeader from '../components/PageHeader';
import CombatFighterCard from '../components/CombatFighterCard';
import { useToast } from '../context/ToastContext';
import { playHitSound, playCritSound, playJutsuSound } from '../utils/audioEngine';

// Constante de precisão básica física
const BASE_PHYSICAL_ACCURACY = 80;

function getCombatJutsus(player) {
  return player?.activeJutsus || [];
}

function getJutsuCombatStats(jutsu, player, npcDef, cooldowns) {
  const jutsuBaseAcc = jutsu.accuracy || 100;
  const playerPrecision = player?.precisao || player?.pre || 0;
  const finalAcc = Math.min(100, jutsuBaseAcc + Math.floor(playerPrecision / 2));

  const cat = (jutsu.category || '').toLowerCase();
  let attrValue = 0;
  if (cat === 'ninjutsu') attrValue = player.ninjutsu || player.nin || 0;
  else if (cat === 'taijutsu') attrValue = player.taijutsu || player.tai || 0;
  else if (cat === 'genjutsu') attrValue = player.genjutsu || player.gen || 0;
  else if (cat === 'bukijutsu') attrValue = player.bukijutsu || player.buk || 0;
  else attrValue = player.ninjutsu || player.nin || 0;

  const bonusDano = getJutsuEnhancementBonus(jutsu, 'dano');
  const bonusCusto = getJutsuEnhancementBonus(jutsu, 'custo');
  const bonusLetalidade = getJutsuEnhancementBonus(jutsu, 'letalidade');

  const jutsuBaseDmg = (jutsu.damage || 15) + bonusDano;
  const magicDmg = Math.floor(attrValue / 2) + jutsuBaseDmg;
  const estDamage = Math.max(1, magicDmg - Math.floor(npcDef / 2));

  const seloDiscount = Math.min(0.5, (player.selos || 0) * 0.01);
  const originalCost = jutsu.chakraCost || 20;
  const baseCost = originalCost + bonusCusto;
  const cost = Math.floor(Math.max(originalCost * 0.1, Math.max(1, baseCost * (1 - seloDiscount))));

  const hasEssences = bonusDano > 0 || bonusCusto < 0 || bonusLetalidade > 0;
  const jutsuLevel = jutsu.level || 1;
  const jutsuCdVal = cooldowns[jutsu.id] || 0;

  return { finalAcc, cost, estDamage, hasEssences, jutsuLevel, jutsuCdVal, isOnCooldown: jutsuCdVal > 0 };
}

export default function Combate({ player, updatePlayer, setPlayerState }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const rawNpc = location.state?.npc;
  const isMirror = location.state?.isMirror;
  const npcInitVal = (rawNpc && rawNpc.is_story_mode && !isMirror) ? scaleStoryNPC(rawNpc, player) : rawNpc;
  const isAltAutoBattle = location.state?.isAltAutoBattle || false;

  const [npcInit, setNpcInit] = useState(npcInitVal);

  useEffect(() => {
    if (!npcInit || !player) {
      navigate('/dojo');
    }
  }, [npcInit, player, navigate]);

  // Clãs
  const clanBonus = player?.clan ? (player.clan_bonus || { name: player.clan, critChance: 0, armorPen: 0, paralyzeChance: 0 }) : { critChance: 0, armorPen: 0, paralyzeChance: 0 };
  if (player?.clan === 'Hyuga') clanBonus.armorPen = 0.2;
  if (player?.clan === 'Uchiha') clanBonus.critChance = 0.15;
  if (player?.clan === 'Nara') clanBonus.paralyzeChance = 0.10;

  // Calculando os status máximos do Jogador
  const maxPlayerHP = calculateHP(player);
  const maxPlayerCP = calculateChakra(player);
  const maxPlayerSt = calculateStamina(player);

  const playerAtkTaiBuk = calculateAtkTaiBuk(player);
  const playerAtkNinGen = calculateAtkNinGen(player);
  const playerDef = calculateDefNinGen(player);
  const playerPrecision = player?.precisao || player?.pre || 0;
  const playerArmorPen = (player?.tai || 0) / 10;

  // --- BOOST DOS 8 PORTÕES ---
  const PORTOES_TABLE = [
    { id: 1, boost: 0.05 }, { id: 2, boost: 0.10 }, { id: 3, boost: 0.20 },
    { id: 4, boost: 0.35 }, { id: 5, boost: 0.50 }, { id: 6, boost: 0.70 },
    { id: 7, boost: 1.00 }, { id: 8, boost: 2.00 }
  ];
  const COOLDOWN_MS = 30 * 60 * 1000;
  const getPortaoBoost = () => {
    if (!player?.portoes_used_at || !player?.portao_nivel) return 1.0;
    const usedAt = new Date(player.portoes_used_at).getTime();
    if (Date.now() - usedAt > COOLDOWN_MS) return 1.0;
    const portao = PORTOES_TABLE.find(p => p.id === player.portao_nivel);
    return portao ? 1 + portao.boost : 1.0;
  };
  const portaoAtkMultiplier = getPortaoBoost();

  const npcMaxHP = npcInit?.hp || 1;
  const npcMaxCP = npcInit?.chakra || 1;
  const npcMaxSt = 100;

  const npcAtkTaiBuk = isMirror ? calculateAtkTaiBuk(npcInit) : (npcInit?.atk || 0);
  const npcAtkNinGen = isMirror ? calculateAtkNinGen(npcInit) : (npcInit?.atk || 0);
  const npcDef = isMirror ? calculateDefNinGen(npcInit) : (npcInit?.def || 0);

  // Estados da Batalha
  const [playerHP, setPlayerHP] = useState(player.hp !== undefined && player.hp !== null ? Math.min(player.hp, maxPlayerHP) : maxPlayerHP);
  const [playerCP, setPlayerCP] = useState(player.chakra !== undefined && player.chakra !== null ? Math.min(player.chakra, maxPlayerCP) : maxPlayerCP);
  const [playerSt, setPlayerSt] = useState(player.stamina !== undefined && player.stamina !== null ? Math.min(player.stamina, maxPlayerSt) : maxPlayerSt);

  const [npcHP, setNpcHP] = useState(npcInit?.hp || 1);
  const [npcMaxHPVal, setNpcMaxHPVal] = useState(npcInit?.hp || 1);
  const [npcCP, setNpcCP] = useState(npcInit?.chakra || 50);
  const [npcSt, setNpcSt] = useState(npcMaxSt);

  const timeoutRefs = useRef([]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  const [playerStatus, setPlayerStatus] = useState([]);
  const [npcStatus, setNpcStatus] = useState([]);
  const [cooldowns, setCooldowns] = useState({});
  const [npcCooldowns, setNpcCooldowns] = useState({});
  const [activeBuffs, setActiveBuffs] = useState({ protecao: 0, letalidade: 0, duration: 0 });

  const playerStatusRef = useRef(playerStatus);
  const npcStatusRef = useRef(npcStatus);
  const playerHPRef = useRef(playerHP);
  const cooldownsRef = useRef(cooldowns);
  const npcCooldownsRef = useRef(npcCooldowns);
  const logsContainerRef = useRef(null);

  const [surrenderConfirm, setSurrenderConfirm] = useState(false);

  // Efeitos Visuais
  const [fcts, setFcts] = useState([]);
  const [playerShake, setPlayerShake] = useState(false);
  const [npcShake, setNpcShake] = useState(false);

  const spawnFct = (target, text, type) => {
    const id = Date.now() + Math.random();
    setFcts(prev => [...prev, { id, target, text, type }]);
    setTimeout(() => setFcts(prev => prev.filter(f => f.id !== id)), 1200);
  };

  const triggerShake = (target) => {
    if (target === 'player') {
      setPlayerShake(true);
      setTimeout(() => setPlayerShake(false), 400);
    } else {
      setNpcShake(true);
      setTimeout(() => setNpcShake(false), 400);
    }
  };

  useEffect(() => { playerStatusRef.current = playerStatus; }, [playerStatus]);
  useEffect(() => { npcStatusRef.current = npcStatus; }, [npcStatus]);
  useEffect(() => { cooldownsRef.current = cooldowns; }, [cooldowns]);
  useEffect(() => { playerHPRef.current = playerHP; }, [playerHP]);
  useEffect(() => { npcCooldownsRef.current = npcCooldowns; }, [npcCooldowns]);

  const [logs, setLogs] = useState([
    location.state?.isWorldBoss ? `🔥 O céu escurece... ${npcInit?.name} surgiu! Prepare-se!` :
      isMirror ? `⚠️ INVASÃO! Você foi emboscado pelo ninja rival ${npcInit?.name}!` : `Um combate se inicia contra ${npcInit?.name}!`
  ]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(!isAltAutoBattle);
  const [battleResult, setBattleResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [turnCount, setTurnCount] = useState(1);
  const [roundCount, setRoundCount] = useState(1);
  const npcTurnCompletedRef = useRef(false);
  const [accumulatedDamage, setAccumulatedDamage] = useState(0);
  const [globalDebuffs, setGlobalDebuffs] = useState(getGlobalDebuffs(null));
  const [autoBattle, setAutoBattle] = useState(false);
  const [equippedSummon, setEquippedSummon] = useState(null);
  const [activeJutsuTab, setActiveJutsuTab] = useState('All');

  const raidTotal = location.state?.raidTotal ?? 0;
  const [raidCurrent, setRaidCurrent] = useState(location.state?.raidCurrent ?? 0);

  useEffect(() => {
    async function fetchSummon() {
      if (!player?.id) return;
      const { data } = await supabase
        .from('player_summons')
        .select('*, summons(*)')
        .eq('player_id', player.id)
        .eq('is_equipped', true)
        .single();
      if (data) setEquippedSummon(data.summons);
    }
    fetchSummon();
  }, [player?.id]);

  useEffect(() => {
    async function checkGlobalDebuffs() {
      if (location.state?.isWorldBoss) {
        setGlobalDebuffs(getGlobalDebuffs(npcInit));
        return;
      }
      const { data } = await supabase.from('global_events').select('*').eq('is_active', true).eq('is_world_boss', true).single();
      if (data) setGlobalDebuffs(getGlobalDebuffs(data));
    }
    checkGlobalDebuffs();
  }, [location.state, npcInit]);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (setPlayerState) {
      setPlayerState(prev => prev ? { ...prev, hp: playerHP, chakra: playerCP } : prev);
    }
  }, [playerHP, playerCP, setPlayerState]);

  useEffect(() => {
    let timer;
    if (isPlayerTurn && !battleResult && !isAltAutoBattle) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            addLog("Tempo esgotado! Você perdeu a vez.");
            setIsPlayerTurn(false);
            npcTurn(npcHP);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayerTurn, battleResult, npcHP, isAltAutoBattle]);

  useEffect(() => {
    let timer;
    if (isAltAutoBattle && !battleResult) {
      timer = setTimeout(() => {
        const pPower = ((player?.level || 1) * 150) + ((player?.pontos_atributos || 0) * 50);
        const nPower = ((npcInit?.level || 1) * 150) + 1000;
        const winChance = pPower / (pPower + nPower);
        if (Math.random() < winChance) {
          setNpcHP(0);
          addLog(`🤖 Wintrading Shield: O seu Alter Ego venceu a batalha contra o invasor!`);
          setBattleResult('win');
          handleWin();
        } else {
          setPlayerHP(0);
          addLog(`🤖 Wintrading Shield: O invasor foi muito forte e derrotou o seu Alter Ego...`);
          setBattleResult('lose');
          setPlayerFainted();
        }
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [isAltAutoBattle, battleResult]);

  useEffect(() => {
    let timer;
    if (isPlayerTurn && autoBattle && !battleResult && !isAltAutoBattle) {
      timer = setTimeout(() => {
        const jutsus = getCombatJutsus(player);
        const availableJutsus = jutsus.filter(j => playerCP >= (j.chakraCost || 20));

        if (availableJutsus.length > 0 && Math.random() > 0.4) {
          const jutsuToUse = availableJutsus[Math.floor(Math.random() * availableJutsus.length)];
          handleJutsu(jutsuToUse);
        } else {
          handleBasicAttack();
        }
      }, 1000);
    }
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayerTurn, autoBattle]);

  const addLog = (msg) => {
    setLogs(prev => [...prev, msg]);
  };

  const applyJutsuEffects = (jutsu, toNpc = true) => {
    if (!jutsu.jutsu_effects || jutsu.jutsu_effects.length === 0) return;

    jutsu.jutsu_effects.forEach(eff => {
      const statusDef = eff.status_effects;
      if (!statusDef) return;

      const newStatus = {
        name: statusDef.name,
        type: statusDef.type,
        icon: statusDef.icon,
        duration: statusDef.duration,
        base_value: statusDef.base_value
      };

      if (toNpc) {
        setNpcStatus(prev => [...prev.filter(s => s.name !== newStatus.name), newStatus]);
        addLog(`🦠 Inimigo sofreu [${newStatus.name}] por ${newStatus.duration} turnos.`);
      } else {
        setPlayerStatus(prev => [...prev.filter(s => s.name !== newStatus.name), newStatus]);
        addLog(`🦠 Você sofreu [${newStatus.name}] por ${newStatus.duration} turnos.`);
      }
    });
  };

  const resetForNextRaidFight = () => {
    const nextFight = raidCurrent + 1;
    setBattleResult(null);
    setNpcHP(npcMaxHPVal);
    setNpcCP(npcInit?.chakra || npcMaxCP);
    setNpcSt(npcMaxSt);
    setNpcStatus([]);
    setPlayerStatus([]);
    setCooldowns({});
    setRoundCount(1);
    setTurnCount(1);
    npcTurnCompletedRef.current = false;
    setIsPlayerTurn(true);
    setTimeLeft(30);
    setSurrenderConfirm(false);
    setRaidCurrent(nextFight);
    addLog(`⚔️ Incursão ${nextFight}/${raidTotal}: um novo oponente surge!`);
  };

  const handleWin = async () => {
    setLoading(true);

    const isDojo = !location.state?.isWorldBoss && !location.state?.isBetrayal && !npcInit.is_dummy;

    const { data: resultData, error: resultError } = await supabase.rpc('finalizar_combate', {
      p_player_id: player.id,
      p_enemy_id: npcInit.id || 999999,
      p_result: 'win',
      p_turn_count: roundCount,
      p_combat_log: logs,
      p_fallback_xp: npcInit.xp_reward || 100,
      p_fallback_ryous: npcInit.ryou_reward || 50,
      p_enemy_name: npcInit.name || 'Desconhecido'
    });

    if (resultError) {
      addToast('Erro ao processar recompensa de combate.', 'error');
    }

    const gainedRyous = resultData?.ryous_gained || 0;
    const gainedXp = resultData?.xp_gained || 0;
    const levelsGained = resultData?.levels_gained || 0;

    let droppedItemMsg = '';
    let vipCoinMsg = '';
    if (!location.state?.isGhost && !location.state?.isWorldBoss) {

      // --- 1. Drop Raro de Kuro Coin (2% de chance) ---
      if (Math.random() <= 0.02) {
        const { error: vipError } = await supabase.from('players').update({
          vip_coins: (player.vip_coins || 0) + 1
        }).eq('id', player.id);
        if (!vipError) {
          vipCoinMsg = ' 🪙 +1 Kuro Coin!';
        }
      }

      // --- 2. Drop de Equipamento ---
      const dropChance = location.state?.fromMap ? 0.35 : 0.25;
      if (Math.random() <= dropChance && !npcInit.is_dummy) {
        const { data: baseItems } = await supabase.from('items').select('*');
        if (baseItems && baseItems.length > 0) {
          const randomBaseItem = baseItems[Math.floor(Math.random() * baseItems.length)];
          const playerNinjaClass = '';
          const rarity = await rollRarity(player.rank || 'Genin');
          const rolledStats = await generateLootStats(rarity, player.rank || 'Genin', playerNinjaClass);

          const { error: insertError } = await supabase.from('player_inventory').insert({
            player_id: player.id,
            item_id: randomBaseItem.id,
            is_equipped: false,
            is_favorite: false,
            rarity: rarity,
            rolled_stats: rolledStats
          });

          if (!insertError) {
            droppedItemMsg = ` Você encontrou [${randomBaseItem.name}] (${rarity})!`;
          }
        }
      }

      // --- 3. Drop de Essência de Aprimoramento ---
      const essenceDropChance = location.state?.fromMap ? 0.30 : 0.15;
      if (Math.random() <= essenceDropChance && !npcInit.is_dummy) {
        const rankToTier = { 'Estudante da Academia': 1, 'Genin': 1, 'Chunin': 2, 'Jounin': 3, 'ANBU': 4, 'Sannin': 4, 'Herói': 5 };
        const tier = rankToTier[player.rank] || 1;
        const essenceTypes = ['dano', 'custo', 'letalidade', 'protecao'];
        const randomType = essenceTypes[Math.floor(Math.random() * essenceTypes.length)];
        const essenceKey = `${randomType}_${tier}`;

        const currentEssences = player.inventory_essences || {};
        const newEssences = { ...currentEssences, [essenceKey]: (currentEssences[essenceKey] || 0) + 1 };
        await supabase.from('players').update({ inventory_essences: newEssences }).eq('id', player.id);
        droppedItemMsg += ` 📜 +1 Essência [${randomType.toUpperCase()} Tier ${tier}]!`;
      }
    }

    if ((npcInit.is_story_mode || npcInit.is_bingo_book) && !location.state?.isGhost) {
      await supabase.from('player_defeated_npcs').insert({
        player_id: player.id,
        npc_id: npcInit.id
      });
    }

    // Salvar HP e Chakra restantes (visto que a RPC não sobrescreve os atributos de batalha)
    const updatesAtuais = {
      hp: playerHP,
      chakra: playerCP
    };
    if (isDojo) updatesAtuais.wins_dojo = (player.wins_dojo || 0) + 1;
    if (location.state?.fromMap) updatesAtuais.daily_map_battles = (player.daily_map_battles || 0) + 1;
    await supabase.from('players').update(updatesAtuais).eq('id', player.id);

    await updatePlayer(player.id);
    if (location.state?.isBetrayal) {
      await supabase.from('players').update({ village_id: 8, clan: null, rank: 'Nukenin' }).eq('id', player.id);
      addToast("Você traiu sua vila e agora faz parte da Akatsuki!", "success");
    } else if (location.state?.isBijuuHunt) {
      addToast("Caçada concluída! Chakra da Bijuu extraído para a Organização!", "success");
    } else if (location.state?.isGhost) {
      addToast(`Você derrotou o fantasma de ${npcInit.name}!`, "success");
    } else if (raidTotal > 0 && raidCurrent < raidTotal) {
      addToast(`Incursão ${raidCurrent}/${raidTotal}! +${gainedXp} XP${droppedItemMsg}${vipCoinMsg}`, 'success');
      resetForNextRaidFight();
      setLoading(false);
      return;
    } else if (raidTotal > 0) {
      addToast(`Incursão completa! ${raidTotal} vitórias seguidas!${droppedItemMsg}${vipCoinMsg}`, 'success');
    } else {
      addToast(`Vitória! +${gainedXp} XP, +${gainedRyous} Ryous.${droppedItemMsg}${vipCoinMsg}`, "success");
      if (levelsGained > 0) {
        addToast(`🎉 Você subiu ${levelsGained} Níveis!`, "success");
      }
    }
    navigate(location.state?.fromMap ? '/mapa' : '/dojo');
  };

  const handleWorldBossEnd = async () => {
    setLoading(true);
    if (accumulatedDamage > 0) {
      const newBossHp = Math.max(0, npcInit.hp - accumulatedDamage);
      const isDead = newBossHp <= 0;
      await supabase.from('global_events').update({ boss_hp: newBossHp }).eq('id', npcInit.eventId);

      // Rastrear Dano (UPSERT com Soma)
      const { data: currentDmg } = await supabase.from('world_boss_damage')
        .select('total_damage').eq('player_id', player.id).eq('event_id', npcInit.eventId).single();

      const newTotalDamage = (currentDmg?.total_damage || 0) + accumulatedDamage;

      await supabase.from('world_boss_damage').upsert({
        player_id: player.id,
        event_id: npcInit.eventId,
        total_damage: newTotalDamage,
        is_last_hit: isDead
      }, { onConflict: 'player_id,event_id' });

      if (isDead) {
        addLog(`O Boss Mundial foi derrotado! Você deu o golpe final! As recompensas estão sendo distribuídas...`);
        // Chama a RPC de distribuição
        await supabase.rpc('distribute_boss_rewards', { p_event_id: npcInit.eventId });
        addToast(`A Raposa de Nove Caudas foi selada! Verifique seu inventário.`, 'success');
      } else {
        addToast(`Sua contribuição de ${accumulatedDamage} de dano foi registrada para o evento!`, 'info');
      }
    }
    await setPlayerFainted();
    navigate('/hospital');
  };

  const setPlayerFainted = async () => {
    if (npcInit.is_dummy) return;
    const isDojo = !location.state?.fromMap && !location.state?.isWorldBoss && !location.state?.isGhost && !location.state?.isBetrayal;
    const updates = { is_fainted: true, fainted_at: new Date().toISOString() };
    if (isDojo) updates.losses_dojo = (player.losses_dojo || 0) + 1;

    await supabase.from('players').update(updates).eq('id', player.id);

    try {
      await supabase.from('battle_logs').insert({
        player_id: player.id,
        enemy_name: npcInit.name,
        result: 'Derrota',
        xp_gained: 0,
        ryous_gained: 0,
        turn_count: roundCount,
        combat_log: logs
      });
    } catch (e) { }

    await updatePlayer(player.user_id);
  };

  const startPlayerTurn = () => {
    if (npcTurnCompletedRef.current) {
      setRoundCount(r => r + 1);
    } else {
      npcTurnCompletedRef.current = true;
    }

    setCooldowns(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (next[k] > 0) next[k] -= 1;
      });
      return next;
    });

    setNpcCooldowns(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (next[k] > 0) next[k] -= 1;
      });
      return next;
    });

    setActiveBuffs(prev => {
      if (prev.duration > 0) {
        if (prev.duration - 1 === 0) {
          addLog("Seus buffs ativos se esgotaram!");
          return { protecao: 0, letalidade: 0, duration: 0 };
        }
        return { ...prev, duration: prev.duration - 1 };
      }
      return prev;
    });

    // Passivas de invocação de início de turno (Ex: Cura)
    if (equippedSummon && equippedSummon.name.includes('Katsuyu')) {
      const healAmt = Math.floor(maxPlayerHP * 0.05); // Cura 5%
      setPlayerHP(prev => Math.min(maxPlayerHP, prev + healAmt));
      addLog(`🐌 ${equippedSummon.name} restaurou ${healAmt} do seu HP!`);
      spawnFct('player', `+${healAmt}`, 'heal');
    }

    // Regra anti-stalemate (Exaustão total)
    if (playerCP < 10 && playerSt < 10 && npcCP < 10 && npcSt < 10) {
      addLog(`⚔️ EMPATE POR EXAUSTÃO: Nenhum dos ninjas possui Chakra ou Stamina para continuar a luta!`);
      setBattleResult('lose');
      setPlayerFainted();
      return;
    }

    setIsPlayerTurn(true);
    setTimeLeft(30);
  };

  const npcTurn = (currentNpcHP) => {
    if (currentNpcHP <= 0) return;

    const t1 = setTimeout(() => {
      addLog(`${npcInit.name} está atacando...`);
      const t2 = setTimeout(() => {
        if (npcInit.is_dummy) {
          addLog('🪵 O Boneco de Madeira apenas balança com o vento...');
          startPlayerTurn();
          return;
        }

        if (location.state?.isWorldBoss) {
          if (turnCount >= 10) {
            addLog(`🚨 AVISO CRÍTICO: ${npcInit.name} está acumulando um chakra absurdo...`);
            addLog(`💥 BIJUU DAMA! O mundo inteiro tremeu. Você foi obliterado.`);
            setPlayerHP(0);
            setBattleResult('world_boss_end');
            return;
          }

          const bossBaseDamage = Math.max(1, (npcAtkTaiBuk * (1 + (turnCount * 0.2))) - playerDef);
          const mult = getElementalMultiplier(npcInit.element, player.element);
          const damage = Math.floor(bossBaseDamage * mult);
          const newPlayerHP = Math.max(0, playerHP - damage);
          setPlayerHP(newPlayerHP);
          playHitSound();
          triggerShake('player');
          spawnFct('player', `-${damage}`, 'damage');
          addLog(`${npcInit.name} causou ${damage} de dano! (Turno ${turnCount}/10)`);
          setTurnCount(t => t + 1);

          if (newPlayerHP <= 0) {
            addLog('Você não suportou a pressão do chakra e caiu...');
            setBattleResult('world_boss_end');
          } else {
            startPlayerTurn();
          }
          return;
        }

        let nHP = currentNpcHP;
        let isStunned = false;
        let isSilenced = false;
        const nextNpcStatus = [];

        npcStatusRef.current.forEach(status => {
          if (status.type === 'dot') {
            nHP = Math.max(0, nHP - status.base_value);
            addLog(`🩸 [${status.name}] causou ${status.base_value} de dano continuo ao inimigo.`);
          } else if (status.type === 'hot') {
            nHP += status.base_value;
            addLog(`💚 [${status.name}] curou ${status.base_value} de vida do inimigo.`);
          } else if (status.type === 'stun') {
            isStunned = true;
            addLog(`💫 Inimigo incapaz de agir devido a [${status.name}].`);
          } else if (status.type === 'silence') {
            isSilenced = true;
          }

          if (status.duration > 1) {
            nextNpcStatus.push({ ...status, duration: status.duration - 1 });
          } else {
            addLog(`⏳ O efeito [${status.name}] expirou no inimigo.`);
          }
        });

        setNpcHP(nHP);
        setNpcStatus(nextNpcStatus);

        if (nHP <= 0) {
          addLog(`${npcInit.name} sucumbiu aos efeitos e caiu!`);
          setBattleResult('win');
          handleWin();
          return;
        }

        if (isStunned) {
          startPlayerTurn();
          return;
        }

        const jutsus = npcInit.activeJutsus || [];
        let usedJutsu = false;
        let damage = 0;
        let elementalMsg = '';

        if (!isSilenced && jutsus.length > 0 && Math.random() > 0.5) {
          const validJutsus = jutsus.filter(j => {
            const currentCooldown = npcCooldownsRef.current[j.id] || 0;
            if (currentCooldown > 0) return false;

            if (j.jutsu_effects && j.jutsu_effects.length > 0) {
              const effectName = j.jutsu_effects[0].status_effects?.name;
              if (playerStatusRef.current.some(s => s.name === effectName)) return false;
            }
            return true;
          });

          const jutsu = validJutsus.length > 0 ? validJutsus[Math.floor(Math.random() * validJutsus.length)] : null;
          
          if (jutsu) {
            const cost = jutsu.chakraCost || 20;

            if (npcCP >= cost) {
              const newNpcCP = npcCP - cost;
              setNpcCP(newNpcCP);
              
              if ((jutsu.cooldown || 0) > 0) {
                setNpcCooldowns(prev => ({ ...prev, [jutsu.id]: (jutsu.cooldown || 0) + 1 }));
              }

              const mult = getElementalMultiplier(jutsu.element || npcInit.element, player.element);
              const jutsuBaseDmg = jutsu.damage || 15;
              const cat = (jutsu.category || "").toLowerCase();
              const npcMagic = (cat === "taijutsu" || cat === "bukijutsu") ? npcAtkTaiBuk : npcAtkNinGen;
              const magicDmg = npcMagic + jutsuBaseDmg;

              // Proteção Passiva do Buff Ativo
              const defBonus = activeBuffs?.protecao || 0;
              const finalDamage = Math.max(1, magicDmg - Math.floor((playerDef + defBonus) / 2));

              damage = Math.floor(finalDamage * mult);

              if (mult > 1.0) elementalMsg = ' (Vantagem Elemental!)';
              if (mult < 1.0) elementalMsg = ' (Desvantagem Elemental)';

              addLog(`⚠️ ${npcInit.name} usou [${jutsu.name}]! Causou ${damage} de dano!${elementalMsg}`);
              applyJutsuEffects(jutsu, false);
              usedJutsu = true;
            }
          }
        }

        if (!usedJutsu) {
          const staminaCost = 15;
          if (npcSt < staminaCost) {
            addLog(`💨 ${npcInit.name} tentou atacar, mas está exausto demais!`);
          } else {
            const newNpcSt = npcSt - staminaCost;
            setNpcSt(newNpcSt);

            const dodgeRoll = Math.random() * 100;
            const dodgeChance = calculateDodgeChance(player);

            if (dodgeRoll <= dodgeChance) {
              addLog(`💨 ${npcInit.name} tentou um ataque básico, mas você esquivou!`);
              damage = 0;
            } else {
              const mult = getElementalMultiplier(npcInit.element, player.element);
              const defBonus = activeBuffs?.protecao || 0;
              const baseDamage = Math.max(1, npcAtkTaiBuk - (playerDef + defBonus));
              damage = Math.floor(baseDamage * mult);

              if (mult > 1.0) elementalMsg = ' (Dano Efetivo!)';
              if (mult < 1.0) elementalMsg = ' (Dano Reduzido)';

              addLog(`${npcInit.name} atacou e causou ${damage} de dano!${elementalMsg}`);
            }
          }
        }

        const newPlayerHP = Math.max(0, playerHPRef.current - damage);
        setPlayerHP(newPlayerHP);

        if (damage > 0) {
          if (activeBuffs?.protecao > 0) addLog(`🛡️ Seu Escudo absorveu parte do impacto!`);
          triggerShake('player');
          if (usedJutsu) {
            playJutsuSound();
            spawnFct('player', `-${damage} MAG`, 'magic');
          } else {
            playHitSound();
            spawnFct('player', `-${damage}`, 'damage');
          }
        }

        if (newPlayerHP <= 0) {
          addLog('Você foi derrotado e caiu inconsciente...');
          setBattleResult('lose');
          setPlayerFainted();
        } else {
          startPlayerTurn();
        }
      }, 1000);
      timeoutRefs.current.push(t2);
    }, 1000);
    timeoutRefs.current.push(t1);
  };

  const handleConsumable = async (cons) => {
    if (!isPlayerTurn || battleResult) return;
    setIsPlayerTurn(false);

    if (cons.type === "hp") setPlayerHP(prev => Math.min(maxPlayerHP, prev + cons.effect_value));
    else if (cons.type === "chakra") setPlayerCP(prev => Math.min(maxPlayerCP, prev + cons.effect_value));
    else if (cons.type === "stamina") setPlayerSt(prev => Math.min(maxPlayerSt, prev + cons.effect_value));

    addLog(`💊 Você usou [${cons.name}] e recuperou ${cons.effect_value} de ${cons.type.toUpperCase()}!`);

    if (cons.pc_id) {
      await supabase.from("player_consumables").update({ quantity: cons.quantity - 1 }).eq("id", cons.pc_id);
      await updatePlayer();
    }

    setTimeout(() => {
      npcTurn(npcHP);
    }, 1000);
  };

  const handleBasicAttack = async () => {
    if (!isPlayerTurn || battleResult) return;

    // COMBATE VIA SERVIDOR ATIVADO
    const USE_SERVER_COMBAT = true;

    if (USE_SERVER_COMBAT) {
      setIsPlayerTurn(false);
      const { data, error } = await supabase.rpc('resolver_turno_combate', {
        p_player_id: player.id,
        p_action: 'basic',
        p_target_type: 'npc',
        p_npc_stats: { def: npcDef, element: npcInit.element },
        p_global_debuffs: globalDebuffs,
        p_equipped_summon: equippedSummon,
        p_active_buffs: activeBuffs,
        p_portao_multiplier: portaoAtkMultiplier,
        p_player_atk_fis: playerAtkTaiBuk,
        p_player_atk_mag: playerAtkNinGen
      });

      if (error) {
        addToast('Erro ao contatar o servidor de combate. Tentando fallback local...', 'error');
        setIsPlayerTurn(true);
        return;
      }

      if (data.error) {
        addToast(data.error, 'error');
        setIsPlayerTurn(true);
        return;
      }

      setPlayerSt(prev => prev - data.stamina_cost);

      if (!data.hit) {
        addLog(`Você usou Ataque Básico mas o inimigo esquivou!`);
        npcTurn(npcHP);
        return;
      }

      const newNpcHP = Math.max(0, npcHP - data.damage);
      setNpcHP(newNpcHP);

      let msg = `Você usou Ataque Básico e causou ${data.damage} de dano!`;
      if (data.is_crit) {
        msg += ` 👁️ CRÍTICO!`;
        playCritSound();
        spawnFct('npc', `-${data.damage} CRIT!`, 'crit');
      } else {
        playHitSound();
        spawnFct('npc', `-${data.damage}`, 'damage');
      }
      triggerShake('npc');
      addLog(msg);

      if (data.paralyzed) {
        addLog('🌑 Sombra Nara: inimigo paralisado! Turno extra ganho.');
        setIsPlayerTurn(true);
        setTimeLeft(30);
        return;
      }

      if (location.state?.isWorldBoss) {
        setAccumulatedDamage(prev => prev + data.damage);
        npcTurn(newNpcHP);
        return;
      }

      if (newNpcHP <= 0) {
        addLog(`Vitória! Você derrotou ${npcInit.name}.`);
        setBattleResult('win');
        handleWin();
      } else {
        npcTurn(newNpcHP);
      }
      return;
    }

    // --- FALLBACK LOCAL / ANTIGO ---

    const staminaCost = Math.floor(15 * globalDebuffs.staminaCostMultiplier);
    if (playerSt < staminaCost) { addToast(`Stamina insuficiente (${staminaCost}) para atacar!`, 'error'); return; }

    setIsPlayerTurn(false);

    const newSt = playerSt - staminaCost;
    setPlayerSt(newSt);

    const totalAccuracy = Math.min(95, BASE_PHYSICAL_ACCURACY + (playerArmorPen / 2) - globalDebuffs.accuracyPenalty);
    const didHit = Math.random() * 100 <= totalAccuracy;

    if (!didHit) {
      addLog(`Você usou Ataque Básico mas o inimigo esquivou!`);
      npcTurn(npcHP);
      return;
    }

    const baseCrit = calculateCritChance(player);
    const clanCrit = clanBonus.critChance > 0 ? clanBonus.critChance * 100 : 0;
    const totalCritChance = baseCrit + clanCrit + (activeBuffs.letalidade || 0);
    const isCrit = Math.random() * 100 <= totalCritChance;
    const defReduction = clanBonus.armorPen > 0 ? Math.floor(npcDef * clanBonus.armorPen) : 0;

    // Passivas de Invocação
    let summonDamageBonus = 0;
    let summonAccBonus = 0;
    if (equippedSummon) {
      if (equippedSummon.name.includes('Gamakichi')) summonDamageBonus += Math.floor(equippedSummon.base_atk * 0.1);
      if (equippedSummon.name.includes('Pakkun')) summonAccBonus += 15;
    }

    // HOTFIX: Trava multiplicador composto de (Oito Portões x Crítico) no máximo de 2.5x
    const critMult = isCrit ? 1.75 : 1.0;
    const combinedMult = Math.min(2.5, portaoAtkMultiplier * critMult);

    let damage = Math.max(1, Math.floor(playerAtkTaiBuk * combinedMult) - Math.floor(npcDef / 2) + defReduction + summonDamageBonus);
    if (portaoAtkMultiplier > 1.0) addLog(`⚡ Os Portões do Chakra impulsionam seu ataque!`);

    const newNpcHP = Math.max(0, npcHP - damage);
    setNpcHP(newNpcHP);

    let msg = `Você usou Ataque Básico e causou ${damage} de dano!`;
    if (isCrit) {
      msg += ` 👁️ CRÍTICO!`;
      playCritSound();
      spawnFct('npc', `-${damage} CRIT!`, 'crit');
    } else {
      playHitSound();
      spawnFct('npc', `-${damage}`, 'damage');
    }
    triggerShake('npc');

    if (clanBonus.armorPen > 0) msg += ` [Byakugan: ignorou def]`;
    if (summonDamageBonus > 0) msg += ` [Bônus de ${equippedSummon.name}]`;
    addLog(msg);

    if (clanBonus.paralyzeChance > 0 && Math.random() < clanBonus.paralyzeChance) {
      addLog('🌑 Sombra Nara: inimigo paralisado! Turno extra ganho.');
      setIsPlayerTurn(true);
      setTimeLeft(30);
      return;
    }

    if (location.state?.isWorldBoss) {
      setAccumulatedDamage(prev => prev + damage);
      npcTurn(newNpcHP);
      return;
    }

    if (newNpcHP <= 0) {
      addLog(`Vitória! Você derrotou ${npcInit.name}.`);
      setBattleResult('win');
      handleWin();
    } else {
      npcTurn(newNpcHP);
    }
  };

  const handleJutsu = async (jutsu) => {
    if (!isPlayerTurn || battleResult) return;

    // COMBATE VIA SERVIDOR ATIVADO
    const USE_SERVER_COMBAT = true;

    if (USE_SERVER_COMBAT) {
      // Cooldown e verificação client-side UI
      const jutsuCooldown = (jutsu.cooldown || 0);
      const currentCooldown = cooldownsRef.current[jutsu.id] || 0;
      if (currentCooldown > 0) { addToast(`[${jutsu.name}] em recarga!`, 'error'); return; }

      setIsPlayerTurn(false);
      const { data, error } = await supabase.rpc('resolver_turno_combate', {
        p_player_id: player.id,
        p_action: 'jutsu',
        p_jutsu_payload: jutsu,
        p_target_type: 'npc',
        p_npc_stats: { def: npcDef, element: npcInit.element },
        p_global_debuffs: globalDebuffs,
        p_equipped_summon: equippedSummon,
        p_active_buffs: activeBuffs,
        p_player_atk_fis: playerAtkTaiBuk,
        p_player_atk_mag: playerAtkNinGen
      });

      if (error || data.error) {
        addToast(error ? error.message : data.error, 'error');
        setIsPlayerTurn(true);
        return;
      }

      const newCP = playerCP - data.chakra_cost;
      setPlayerCP(newCP);

      // +1 to compensate for the immediate decrement in startPlayerTurn
      if (jutsuCooldown > 0) setCooldowns(prev => ({ ...prev, [jutsu.id]: jutsuCooldown + 1 }));

      if (newCP <= 0) {
        addLog(`Você ficou sem Chakra usando [${jutsu.name}] e desmaiou de exaustão...`);
        setBattleResult('lose');
        setPlayerFainted();
        return;
      }

      const newDailyChakra = (player.daily_chakra_spent || 0) + data.chakra_cost;
      await supabase.from('players').update({ daily_chakra_spent: newDailyChakra }).eq('id', player.id);

      if (!data.hit) {
        addLog(`Você usou [${jutsu.name}] mas errou! (Custou ${data.chakra_cost} CP)`);
        npcTurn(npcHP);
        return;
      }

      const newNpcHP = Math.max(0, npcHP - data.damage);
      setNpcHP(newNpcHP);

      playJutsuSound();
      if (data.is_crit) playCritSound();
      triggerShake('npc');
      spawnFct('npc', `-${data.damage}${data.is_crit ? ' CRÍT!' : ' MAG'}`, data.is_crit ? 'crit' : 'magic');

      addLog(`Você usou [${jutsu.name}] e causou ${data.damage} de dano! (Custou ${data.chakra_cost} CP)`);
      applyJutsuEffects(jutsu, true); // Aplica buffs/dots locais de UI

      if (location.state?.isWorldBoss) {
        setAccumulatedDamage(prev => prev + data.damage);
        npcTurn(newNpcHP);
        return;
      }

      if (newNpcHP <= 0) {
        addLog(`Vitória magistral! Você derrotou ${npcInit.name}.`);
        setBattleResult('win');
        handleWin();
      } else {
        npcTurn(newNpcHP);
      }
      return;
    }

    // --- FALLBACK LOCAL / ANTIGO ---

    // --- VERIFICAR COOLDOWN ---
    const jutsuCooldown = (jutsu.cooldown || 0);
    const currentCooldown = cooldownsRef.current[jutsu.id] || 0;
    if (currentCooldown > 0) {
      addToast(`[${jutsu.name}] em recarga! (${currentCooldown} turno${currentCooldown > 1 ? 's' : ''} restante${currentCooldown > 1 ? 's' : ''})`, 'error');
      return;
    }

    // --- APRIMORAMENTOS DE JUTSU (Essências) ---
    const bonusCusto = getJutsuEnhancementBonus(jutsu, 'custo');
    const bonusDano = getJutsuEnhancementBonus(jutsu, 'dano');
    const bonusLetalidade = getJutsuEnhancementBonus(jutsu, 'letalidade');
    const bonusProtecao = getJutsuEnhancementBonus(jutsu, 'protecao');

    // Desconto de Selo: 1% de redução de custo de chakra para cada ponto de Selo (máx 50%)
    const seloDiscount = calculateChakraDiscount(player) * 0.01;
    const originalCost = jutsu.chakraCost || 20;
    const baseCost = originalCost + bonusCusto;
    const cost = Math.floor(Math.max(originalCost * 0.1, Math.max(1, baseCost * (1 - seloDiscount))));
    if (playerCP < cost) { addToast('Chakra insuficiente para usar este jutsu!', 'error'); return; }

    setIsPlayerTurn(false);
    const newCP = playerCP - cost;
    setPlayerCP(newCP);

    // --- APLICAR COOLDOWN DO JUTSU ---
    if (jutsuCooldown > 0) {
      setCooldowns(prev => ({ ...prev, [jutsu.id]: jutsuCooldown + 1 }));
    }

    if (newCP <= 0) {
      addLog(`Você ficou sem Chakra usando [${jutsu.name}] e desmaiou de exaustão...`);
      setBattleResult('lose');
      setPlayerFainted();
      return;
    }

    const newDailyChakra = (player.daily_chakra_spent || 0) + cost;
    await supabase.from('players').update({ daily_chakra_spent: newDailyChakra }).eq('id', player.id);

    const jutsuAccuracy = jutsu.accuracy || 100;
    const totalAccuracy = Math.min(95, jutsuAccuracy + (playerPrecision / 2) - globalDebuffs.accuracyPenalty);
    const didHit = Math.random() * 100 <= totalAccuracy;

    if (!didHit) {
      addLog(`Você usou [${jutsu.name}] mas o ataque errou o alvo! (Custou ${cost} CP)`);
      npcTurn(npcHP);
      return;
    }

    const mult = getElementalMultiplier(jutsu.element || player.element, npcInit.element);
    let jutsuBaseDmg = (jutsu.damage || 15) + bonusDano;

    // Passivas de Invocação no Jutsu
    let summonDamageBonus = 0;
    if (equippedSummon && equippedSummon.name.includes('Gamakichi') && jutsu.element === 'Katon') {
      summonDamageBonus += Math.floor(jutsuBaseDmg * 0.2); // +20% Katon
    }

    let attrValue = 0;
    const cat = (jutsu.category || '').toLowerCase();
    if (cat === 'ninjutsu') attrValue = player.ninjutsu || player.nin || 0;
    else if (cat === 'taijutsu') attrValue = player.taijutsu || player.tai || 0;
    else if (cat === 'genjutsu') attrValue = player.genjutsu || player.gen || 0;
    else if (cat === 'bukijutsu') attrValue = player.bukijutsu || player.buk || 0;
    else attrValue = player.ninjutsu || player.nin || 0; // fallback

    const magicDmg = Math.floor(attrValue / 2) + jutsuBaseDmg;
    const rawDamage = Math.max(1, magicDmg - Math.floor(npcDef / 2) + summonDamageBonus);

    // Crítico: Base (Engine) + Essência de Letalidade do Jutsu + Buffs Ativos
    const baseCrit = calculateCritChance(player);
    const totalCritChance = baseCrit + bonusLetalidade + (activeBuffs.letalidade || 0);
    const critRoll = Math.random() * 100;
    const isCrit = critRoll <= totalCritChance;
    const critMult = isCrit ? 1.5 : 1.0;

    const damage = Math.floor(rawDamage * mult * critMult);

    const newNpcHP = Math.max(0, npcHP - damage);
    setNpcHP(newNpcHP);

    // Aplicação dos Buffs Ativos da Essência deste Jutsu
    if (bonusProtecao > 0 || bonusLetalidade > 0) {
      setActiveBuffs({
        protecao: bonusProtecao,
        letalidade: bonusLetalidade,
        duration: 2 // O Buff dura 2 turnos
      });
      addLog(`✨ O Jutsu ativou um Buff Temporário (2 turnos)!`);
    }

    playJutsuSound();
    if (isCrit) playCritSound();
    triggerShake('npc');
    spawnFct('npc', `-${damage}${isCrit ? ' CRÍT!' : ' MAG'}`, isCrit ? 'crit' : mult > 1 ? 'crit' : 'magic');

    let extraMsg = '';
    if (isCrit) extraMsg += ' ⚡ CRÍTICO!';
    if (mult > 1.0) extraMsg += ' (Vantagem Elemental!)';
    if (mult < 1.0) extraMsg += ' (Desvantagem Elemental)';
    if (bonusDano > 0) extraMsg += ` [+${bonusDano} Essência]`;

    addLog(`Você usou [${jutsu.name}] e causou ${damage} de dano!${extraMsg} (Custou ${cost} CP)`);
    applyJutsuEffects(jutsu, true);

    if (location.state?.isWorldBoss) {
      setAccumulatedDamage(prev => prev + damage);
      npcTurn(newNpcHP);
      return;
    }

    if (newNpcHP <= 0) {
      addLog(`Vitória magistral! Você derrotou ${npcInit.name}.`);
      setBattleResult('win');
      handleWin();
    } else {
      npcTurn(newNpcHP);
    }
  };

  const handleSurrender = async () => {
    if (!surrenderConfirm) {
      addToast('Clique novamente em Desistir para confirmar.', 'info');
      setSurrenderConfirm(true);
      setTimeout(() => setSurrenderConfirm(false), 4000);
      return;
    }
    setSurrenderConfirm(false);
    addLog('Você jogou a toalha e desistiu da batalha...');
    setBattleResult('surrender');
    await setPlayerFainted();
  };

  const pHPPercent = (playerHP / maxPlayerHP) * 100;
  const pCPPercent = (playerCP / maxPlayerCP) * 100;
  const pStPercent = (playerSt / maxPlayerSt) * 100;
  const nHPPercent = (npcHP / npcMaxHP) * 100;
  const nCPPercent = (npcCP / npcMaxCP) * 100;
  const nStPercent = (npcSt / npcMaxSt) * 100;

  if (!player || !npcInit) {
    return (
      <div className="page">
        <PageHeader eyebrow='Erro' title='Combate' />
        <div className="card">Dados do combate perdidos ou não inicializados. Retorne ao menu principal.</div>
      </div>
    );
  }

  const combatBg = (villageId) => {
    if (location.state?.bgType === 'dojo') {
      return { backgroundImage: 'linear-gradient(rgba(10,10,15,0.75), rgba(10,10,15,0.92)), url(/images/bg_dojo.jpg)', backgroundSize: 'cover', backgroundPosition: 'center top' };
    }
    if (location.state?.bgType === 'map') {
      return { backgroundImage: 'linear-gradient(rgba(10,10,15,0.75), rgba(10,10,15,0.92)), url(/images/bg_forest.jpg)', backgroundSize: 'cover', backgroundPosition: 'center top' };
    }
    if (villageId) {
      return { backgroundImage: `linear-gradient(rgba(10,10,15,0.75), rgba(10,10,15,0.92)), url(/images/bg_${villageId}.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center top' };
    }
    return {};
  };

  const playerBadges = [
    clanBonus.name && (
      <div key="clan" className="badge badge-muted" style={{ fontSize: '10px' }}>Clã {clanBonus.name}</div>
    ),
    equippedSummon && (
      <div key="summon" className="badge badge-muted" style={{ fontSize: '10px' }}>🐾 {equippedSummon.name}</div>
    ),
    activeBuffs?.duration > 0 && (
      <div key="buff" className="badge badge-gold" style={{ fontSize: '10px' }}>✨ Buff [{activeBuffs.duration}T]</div>
    ),
    ...playerStatus.map(s => (
      <div key={s.name} className="badge badge-red" style={{ fontSize: '10px' }}>{s.icon || '🦠'} {s.name}</div>
    ))
  ].filter(Boolean);

  const npcBadges = [
    npcInit?.clan && (
      <div key="clan" className="badge badge-muted" style={{ fontSize: '10px' }}>Clã {npcInit.clan}</div>
    ),
    npcInit?.summon && (
      <div key="summon" className="badge badge-muted" style={{ fontSize: '10px' }}>🐾 {npcInit.summon.name}</div>
    ),
    ...npcStatus.map(s => (
      <div key={s.name} className="badge badge-red" style={{ fontSize: '10px' }}>{s.icon || '🦠'} {s.name}</div>
    ))
  ].filter(Boolean);

  return (
    <div className="page">
      <PageHeader eyebrow='A Fúria dos Shinobis' title='Combate' />

      {!battleResult && (
        <div className="combat-turn-bar">
          <div className="flex-between" style={{ fontSize: '12px', marginBottom: '8px' }}>
            <span className="mono gold">
              {isPlayerTurn ? 'SEU TURNO' : 'TURNO INIMIGO'} — Rodada {roundCount}
            </span>
            {isPlayerTurn && (
              <span className={`mono ${timeLeft <= 10 ? 'danger' : 'muted'}`}>{timeLeft}s</span>
            )}
          </div>
          {isPlayerTurn && (
            <div className="progress-track" style={{ height: '4px', background: 'rgba(0,0,0,0.5)' }}>
              <div className={`progress-fill ${timeLeft <= 10 ? 'red' : 'gold'}`} style={{ width: `${(timeLeft / 30) * 100}%`, transition: 'width 1s linear' }} />
            </div>
          )}
        </div>
      )}

      <div className="flex-col" style={{ width: '100%', gap: '16px' }}>

        <div className="combat-arena">
          <CombatFighterCard
            side="left"
            shake={playerShake}
            fcts={fcts.filter(f => f.target === 'player')}
            bgStyle={combatBg(player.village_id)}
            portrait={player.avatar?.startsWith('/') ? player.avatar : (player.avatar || '忍')}
            name={player.name}
            level={player.level}
            subtitle={equippedSummon ? equippedSummon.name : null}
            badges={playerBadges}
            hp={playerHP}
            maxHp={maxPlayerHP}
            cp={playerCP}
            maxCp={maxPlayerCP}
            st={playerSt}
            maxSt={maxPlayerSt}
            hpPct={pHPPercent}
            cpPct={pCPPercent}
            stPct={pStPercent}
          />

          <div className="combat-center-col">
            <div className="combat-vs-badge">VS</div>
            {raidTotal > 0 && (
              <div className="badge badge-gold combat-raid-badge">
                Incursão {raidCurrent}/{raidTotal}
              </div>
            )}
            <div className="combat-log combat-log-center" ref={logsContainerRef}>
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className="combat-log-line"
                  data-type={
                    log.includes('Você usou') || log.includes('Você causou') ? 'player'
                      : log.includes('causou') || log.includes('atacou') || log.includes('usou [') ? 'enemy'
                        : 'neutral'
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          <CombatFighterCard
            side="right"
            shake={npcShake}
            fcts={fcts.filter(f => f.target === 'npc')}
            bgStyle={combatBg(npcInit.village_id || (isMirror ? 8 : 1))}
            portrait={typeof npcInit.avatar === 'string' && npcInit.avatar.startsWith('/') ? npcInit.avatar : (npcInit.avatar || '🥷')}
            name={npcInit.name}
            level={npcInit.level}
            badges={npcBadges}
            hp={npcHP}
            maxHp={npcMaxHP}
            cp={npcCP}
            maxCp={npcMaxCP}
            st={npcSt}
            maxSt={npcMaxSt}
            hpPct={nHPPercent}
            cpPct={nCPPercent}
            stPct={nStPercent}
            isMirror={isMirror}
          />
        </div>

        {!battleResult ? (
          isAltAutoBattle ? (
            <div className="card flex-col" style={{ textAlign: 'center', border: '1px dashed var(--gold)', background: 'var(--ink)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🤖</div>
              <h3 className="gold" style={{ marginBottom: '8px' }}>Modo Auto-Battle</h3>
              <p className="muted" style={{ fontSize: '12px' }}>O Wintrading Shield foi ativado. Você não pode interferir no combate contra seu próprio alter ego. O sistema resolverá a batalha com base nos atributos e na sorte de ambos.</p>
            </div>
          ) : (
            <div className="combat-actions">
              <div className="combat-actions-header">
                <span className="mono uppercase" style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'var(--muted)' }}>Ações</span>
                <span className="badge badge-muted">{getCombatJutsus(player).length + 1} técnicas</span>
              </div>

              <div className="combat-jutsu-section">
                <div className="flex-row" style={{ gap: '4px', marginBottom: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['All', 'Ninjutsu', 'Taijutsu', 'Genjutsu', 'Bukijutsu'].map(tab => {
                    const count = tab === 'All' ? getCombatJutsus(player).length : getCombatJutsus(player).filter(j => (j.category || '').toLowerCase() === tab.toLowerCase()).length;
                    if (tab !== 'All' && count === 0) return null;
                    return (
                      <button
                        key={tab}
                        className={`badge ${activeJutsuTab === tab ? 'badge-gold' : 'badge-muted'}`}
                        style={{ cursor: 'pointer', border: 'none', padding: '6px 12px' }}
                        onClick={() => setActiveJutsuTab(tab)}
                      >
                        {tab === 'All' ? 'Todos' : tab} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="combat-jutsu-bar">
                  <button
                    className="combat-jutsu-btn combat-basic-btn"
                    disabled={!isPlayerTurn}
                    onClick={handleBasicAttack}
                    title={`Ataque Básico\n${Math.max(1, Math.floor(playerAtkTaiBuk * portaoAtkMultiplier) - Math.floor(npcDef / 2))} DMG | ${BASE_PHYSICAL_ACCURACY + (playerArmorPen / 2) - globalDebuffs.accuracyPenalty}% ACC`}
                    type="button"
                  >
                    <span className="combat-basic-icon">👊</span>
                    <span className="jutsu-name">Básico</span>
                    <span className="jutsu-cost">{Math.max(1, Math.floor(playerAtkTaiBuk * portaoAtkMultiplier) - Math.floor(npcDef / 2))}</span>
                  </button>

                  {getCombatJutsus(player)
                    .filter(jutsu => activeJutsuTab === 'All' || (jutsu.category || '').toLowerCase() === activeJutsuTab.toLowerCase())
                    .map((jutsu) => {
                      const stats = getJutsuCombatStats(jutsu, player, npcDef, cooldowns);

                      return (
                        <button
                          key={jutsu.id}
                          className={`combat-jutsu-btn ${stats.isOnCooldown ? 'on-cooldown' : ''} ${stats.hasEssences ? 'enhanced' : ''}`}
                          disabled={!isPlayerTurn || stats.isOnCooldown}
                          onClick={() => handleJutsu(jutsu)}
                          title={`${jutsu.name}\n${stats.cost} CP | ${stats.estDamage} DMG | ${stats.finalAcc}% ACC\nCD: ${jutsu.cooldown || 0}T`}
                          type="button"
                        >
                          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                            <JutsuIcon jutsu={jutsu} />
                          </div>
                          {stats.isOnCooldown && (
                            <div className="jutsu-cd-overlay">{stats.jutsuCdVal}</div>
                          )}
                          <span className="jutsu-name">{jutsu.name}</span>
                          <span className="jutsu-cost">{stats.cost}</span>
                          <span className="jutsu-level">Lv.{stats.jutsuLevel}</span>
                        </button>
                      );
                    })}

                  {getCombatJutsus(player).length === 0 && (
                    <div className="info-banner" style={{ flex: 1, fontSize: '11px', padding: '12px 16px', minWidth: '200px' }}>
                      Aprenda jutsus na Academia Ninja
                    </div>
                  )}
                </div>
              </div>

              <div className="combat-secondary-actions">
                <button
                  className="btn-ghost flex-row"
                  style={{ border: surrenderConfirm ? '2px solid #ef4444' : '1px dashed #ef4444', color: '#ef4444', opacity: isPlayerTurn ? 1 : 0.5, justifyContent: 'center', gap: '8px', fontWeight: surrenderConfirm ? 'bold' : 'normal' }}
                  disabled={!isPlayerTurn}
                  onClick={handleSurrender}
                  type="button"
                >
                  <span style={{ fontSize: '18px' }}>🏳️</span>
                  {surrenderConfirm ? 'Confirmar!' : 'Desistir'}
                </button>

                <button
                  className={`btn-ghost flex-row ${autoBattle ? 'active' : ''}`}
                  style={{ border: autoBattle ? '1px solid var(--gold)' : '1px solid var(--line)', color: autoBattle ? 'var(--gold)' : 'var(--muted)', opacity: isPlayerTurn ? 1 : 0.5, justifyContent: 'center', gap: '8px' }}
                  onClick={() => setAutoBattle(!autoBattle)}
                  type="button"
                >
                  <span style={{ fontSize: '18px' }}>🤖</span>
                  Auto: {autoBattle ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="flex-col" style={{ textAlign: 'center', padding: '24px', border: `1px solid ${battleResult === 'win' ? 'var(--gold)' : '#ef4444'}`, background: 'var(--ink-soft)', alignItems: 'center' }}>
            <h2 className={battleResult === 'win' ? 'page-title gold' : 'page-title danger'} style={{ marginBottom: '16px' }}>
              {battleResult === 'win' ? 'Vitória!' : (battleResult === 'world_boss_end' ? 'Fim da Incursão' : 'Inconsciente')}
            </h2>

            {battleResult === 'world_boss_end' && (
              <p className="muted" style={{ marginBottom: '16px' }}>Você causou um total de <strong className="danger" style={{ fontSize: '18px' }}>{accumulatedDamage}</strong> de dano ao Chefe Global!</p>
            )}

            <button className="btn-primary" onClick={battleResult === 'world_boss_end' ? handleWorldBossEnd : () => navigate(battleResult === 'win' ? (location.state?.isExame ? '/exame' : (location.state?.fromMap ? '/mapa' : '/dojo')) : (location.state?.isExame ? '/exame' : '/hospital'), { state: { roundWon: battleResult === 'win' ? location.state?.exameRound : null } })} disabled={loading}>
              <span>{loading ? 'Retornando...' : (battleResult === 'win' ? 'Retornar' : 'Ir para o Hospital')}</span>
              <div className="stamp"></div>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}