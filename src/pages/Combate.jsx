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
  const isExame = Boolean(location.state?.isExame);
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
  const [combatSessionId, setCombatSessionId] = useState(null);
  const [combatSessionLoading, setCombatSessionLoading] = useState(false);
  const [combatSessionFailed, setCombatSessionFailed] = useState(false);
  const combatSessionStartRef = useRef(false);
  const pendingVictoryRecoveryRef = useRef(false);
  const resumedEnemyTurnRef = useRef(null);
  const handleWinRecoveryRef = useRef(null);
  const combatSessionEligible = Boolean(
    player?.id &&
    !location.state?.isWorldBoss &&
    (!isMirror || isExame) &&
    !npcInit?.is_dummy &&
    (!location.state?.isGhost || isExame) &&
    !location.state?.isBijuuHunt &&
    !isAltAutoBattle &&
    !(raidTotal > 0) &&
    (isExame
      ? Number(location.state?.exameRound) >= 1 && Number(location.state?.exameRound) <= 3
      : Number.isInteger(Number(npcInit?.id)) && Number(npcInit.id) > 0)
  );

  useEffect(() => {
    if (!combatSessionEligible || combatSessionStartRef.current) return;
    combatSessionStartRef.current = true;
    setCombatSessionLoading(true);

    const startSession = async () => {
      const { data, error } = isExame
        ? await supabase.rpc('iniciar_exame_chunin', {
            p_player_id: player.id,
            p_round: Number(location.state?.exameRound)
          })
        : await supabase.rpc('iniciar_combate_sessao', {
            p_player_id: player.id,
            p_enemy_id: Number(npcInit.id),
            p_from_map: Boolean(location.state?.fromMap),
            p_is_dojo: !location.state?.fromMap &&
              !location.state?.isStoryQuest &&
              !npcInit?.is_story_mode &&
              !npcInit?.is_bingo_book &&
              !location.state?.isBetrayal
          });

      if (error || !data?.success || !data?.session_id) {
        const reason = error?.message || data?.error || 'Resposta inválida do servidor.';
        setCombatSessionFailed(true);
        addToast('Não foi possível validar esta batalha no servidor: ' + reason, 'error');
        return;
      }

      setCombatSessionId(data.session_id);
      if (data.resumed_session === true) {
        setTurnCount(Math.max(1, Number(data.turn_count) || 1));
        addLog('Combate ativo recuperado do servidor.');
        if (data.awaiting_enemy_turn === true) {
          resumedEnemyTurnRef.current = {
            sessionId: data.session_id,
            enemyId: Number(data.enemy_id),
            enemyHP: Number(data.enemy_hp)
          };
          setIsPlayerTurn(false);
        } else {
          setIsPlayerTurn(true);
          setTimeLeft(30);
        }
      }
      setNpcHP(data.enemy_hp);
      setNpcMaxHPVal(data.enemy_max_hp);
      setNpcCP(data.enemy_chakra);
      setNpcInit(prev => ({
        ...prev,
        id: data.enemy_id,
        name: data.enemy_name,
        level: data.enemy_level,
        hp: data.enemy_max_hp,
        atk: data.enemy_atk,
        def: data.enemy_def,
        chakra: data.enemy_chakra,
        element: data.enemy_element,
        xp_reward: data.xp_reward,
        ryou_reward: data.ryou_reward
      }));
      setPlayerHP(data.player_hp);
      setPlayerCP(data.player_chakra);
      setPlayerSt(data.player_stamina);
      setPlayerState?.(prev => prev ? {
        ...prev,
        hp: data.player_hp,
        chakra: data.player_chakra,
        stamina: data.player_stamina
      } : prev);

      if (data.pending_victory === true) {
        pendingVictoryRecoveryRef.current = true;
        setNpcHP(0);
        setIsPlayerTurn(false);
        addLog('Vitória pendente recuperada. O servidor está confirmando e registrando suas recompensas.');
        setBattleResult('win');
      }
    };

    startSession()
      .catch(error => {
        setCombatSessionFailed(true);
        addToast('Erro ao iniciar combate validado: ' + (error?.message || 'erro inesperado'), 'error');
      })
      .finally(() => setCombatSessionLoading(false));
  }, [
    combatSessionEligible, player?.id, npcInit?.id,
    location.state?.fromMap, location.state?.isStoryQuest,
    location.state?.isBetrayal, location.state?.isExame,
    location.state?.exameRound, npcInit?.is_story_mode,
    npcInit?.is_bingo_book, addToast, setPlayerState
  ]);

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
            if (combatSessionId) {
              supabase.rpc('resolver_turno_combate_sessao', {
                p_player_id: player.id,
                p_session_id: combatSessionId,
                p_action: 'pass'
              }).then(({ data, error }) => {
                if (error || !data?.success) {
                  addToast('O servidor não confirmou a perda de turno: ' + (error?.message || data?.error || 'operação recusada'), 'error');
                  setIsPlayerTurn(true);
                  setTimeLeft(30);
                  return;
                }
                npcTurn(Number.isFinite(data.enemy_hp_remaining) ? data.enemy_hp_remaining : npcHP);
              }).catch(error => {
                addToast('Erro ao resolver o turno: ' + (error?.message || 'erro inesperado'), 'error');
                setIsPlayerTurn(true);
                setTimeLeft(30);
              });
            } else {
              npcTurn(npcHP);
            }
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

    let resultData = null;
    let resultError = null;
    if (combatSessionId) {
      const result = await supabase.rpc('finalizar_combate_sessao', {
        p_player_id: player.id,
        p_session_id: combatSessionId,
        p_turn_count: roundCount,
        p_combat_log: [...logs, `[STATUS FINAL] HP: ${Math.max(0, playerHP)}/${maxPlayerHP} | Chakra: ${playerCP}/${maxPlayerCP} | Stamina: ${playerSt}/${maxPlayerSt}`]
      });
      resultData = result.data;
      resultError = result.error;

      if (resultError || !resultData?.success || resultData?.session_settled !== true) {
        addToast('O servidor não confirmou a vitória; nenhuma recompensa será entregue.', 'error');
        setLoading(false);
        return;
      }
    } else {
      // Temporary encounters that do not have server sessions are deliberately non-rewarding.
      addToast('Esta batalha não possui uma sessão validada pelo servidor; recompensas e progresso foram bloqueados.', 'info');
    }

    const hasVerifiedWin = Boolean(combatSessionId && !resultError && resultData?.success && resultData?.session_settled);
    if (hasVerifiedWin && resultData?.is_exam === true) {
      await updatePlayer(player.id);
      navigate('/exame', { state: { roundWon: Number(resultData.exam_round_completed) } });
      setLoading(false);
      return;
    }
    const gainedRyous = hasVerifiedWin ? (resultData?.ryous_gained || 0) : 0;
    const gainedXp = hasVerifiedWin ? (resultData?.xp_gained || 0) : 0;
    const levelsGained = hasVerifiedWin ? (resultData?.levels_gained || 0) : 0;

    let droppedItemMsg = '';
    let vipCoinMsg = '';
    if (hasVerifiedWin && resultData?.vip_coin_dropped) vipCoinMsg = ' 🪙 +1 Kuro Coin!';
    if (hasVerifiedWin && resultData?.loot_item_name) {
      droppedItemMsg = ` Você encontrou [${resultData.loot_item_name}] (${resultData.loot_rarity || 'Comum'})!`;
    }
    if (hasVerifiedWin && resultData?.essence_key) {
      const [essenceType, essenceTier] = String(resultData.essence_key).split('_');
      droppedItemMsg += ` 📜 +1 Essência [${String(essenceType).toUpperCase()} Tier ${essenceTier}]!`;
    }

    if (updatePlayer) await updatePlayer(player.id);

    // Only verified server sessions can cause irreversible story, clan, or mission progress.
    if (!hasVerifiedWin) {
      navigate(location.state?.fromMap ? '/mapa' : '/dojo');
      setLoading(false);
      return;
    }

    if (location.state?.isBetrayal) {
      const { error: betrayalError } = await supabase.rpc('trair_vila', { p_player_id: player.id });
      if (betrayalError) addToast('Erro ao registrar traição: ' + betrayalError.message, 'error');
      else addToast('Você traiu sua vila e agora faz parte da Akatsuki!', 'success');
    } else if (location.state?.isBijuuHunt) {
      addToast('Caçada concluída! Chakra da Bijuu extraído para a Organização!', 'success');
    } else if (location.state?.isGhost) {
      addToast(`Você derrotou o fantasma de ${npcInit.name}!`, 'success');
    } else {
      addToast(`Vitória! +${gainedXp} XP, +${gainedRyous} Ryous.${droppedItemMsg}${vipCoinMsg}`, 'success');
      if (levelsGained > 0) addToast(`🎉 Você subiu ${levelsGained} Níveis!`, 'success');
    }

    if (location.state?.isStoryQuest) {
      const { data: questData, error: questError } = await supabase.rpc('concluir_story_quest', {
        p_player_id: player.id,
        p_quest_id: location.state?.npc?.storyQuestId
      });
      if (questError || questData?.success === false) {
        addToast('A vitória foi validada, mas a missão não pôde ser concluída.', 'warning');
      }
      navigate('/historia');
    } else {
      navigate(location.state?.fromMap ? '/mapa' : '/dojo');
    }
    setLoading(false);
  };

  // Keep a current handler for the one-time pending-victory recovery effect below.
  handleWinRecoveryRef.current = handleWin;

  useEffect(() => {
    if (!pendingVictoryRecoveryRef.current || !combatSessionId || battleResult !== 'win') return;
    pendingVictoryRecoveryRef.current = false;
    handleWinRecoveryRef.current?.();
  }, [combatSessionId, battleResult]);

  const handleWorldBossEnd = async () => {
    setLoading(true);

    // O dano e as recompensas já foram registrados atomicamente pelo servidor
    // a cada turno; o cliente não pode editar o HP global nem distribuir baús.
    if (npcInit?.bossSessionId) {
      const { data, error } = await supabase.rpc('encerrar_world_boss', {
        p_player_id: player.id,
        p_session_id: npcInit.bossSessionId
      });

      if (error || data?.success === false) {
        addToast('Não foi possível encerrar a sessão: ' + (error?.message || data?.error || 'erro desconhecido'), 'error');
      } else if (npcHP <= 0) {
        addLog('O Chefe Mundial foi derrotado. As recompensas foram processadas pelo servidor.');
        addToast('A incursão terminou. Confira suas recompensas no inventário.', 'success');
      } else if ((data?.damage_total || accumulatedDamage) > 0) {
        addToast(`Sua contribuição de ${data?.damage_total ?? accumulatedDamage} de dano já foi registrada.`, 'info');
      }
    }

    await setPlayerFainted();
    await updatePlayer(player.id);
    navigate('/hospital');
  };

  const setPlayerFainted = async () => {
    if (npcInit.is_dummy) return;

    const { data, error } = await supabase.rpc('marcar_jogador_derrotado', {
      p_player_id: player.id
    });
    if (error || !data?.success) {
      addToast('Não foi possível registrar a derrota: ' + (error?.message || data?.error || 'operação recusada'), 'error');
    }

    try {
      await supabase.from('battle_logs').insert({
        player_id: player.id,
        enemy_name: npcInit.name,
        result: 'Derrota',
        xp_gained: 0,
        ryous_gained: 0,
        turn_count: roundCount,
        combat_log: [...logs, `[STATUS FINAL] HP: ${Math.max(0, playerHP)}/${maxPlayerHP} | Chakra: ${playerCP}/${maxPlayerCP} | Stamina: ${playerSt}/${maxPlayerSt}`]
      });
    } catch (e) { }

    await updatePlayer(player.id);
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
    if (!combatSessionId && playerCP < 10 && playerSt < 10 && npcCP < 10 && npcSt < 10) {
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

    if (combatSessionId && !location.state?.isWorldBoss) {
      const timer = setTimeout(async () => {
        addLog(`${npcInit.name} está respondendo ao seu turno...`);
        const { data, error } = await supabase.rpc('responder_turno_combate_sessao', {
          p_player_id: player.id,
          p_session_id: combatSessionId
        });

        if (error || !data?.success) {
          addToast('Erro ao resolver o turno inimigo: ' + (error?.message || data?.error || 'operação recusada'), 'error');
          setIsPlayerTurn(true);
          return;
        }

        const remainingHp = Number(data.player_hp_remaining);
        setPlayerHP(Number.isFinite(remainingHp) ? remainingHp : 0);
        setPlayerState?.(prev => prev ? { ...prev, hp: Number.isFinite(remainingHp) ? remainingHp : 0 } : prev);

        if (data.dodged) {
          addLog(`💨 Você esquivou do ataque de ${npcInit.name}!`);
        } else {
          const damage = Math.max(0, Number(data.damage) || 0);
          addLog(`${npcInit.name} atacou e causou ${damage} de dano!`);
          if (damage > 0) {
            playHitSound();
            triggerShake('player');
            spawnFct('player', `-${damage}`, 'damage');
          }
        }

        if (data.player_defeated || remainingHp <= 0) {
          addLog('Você foi derrotado e caiu inconsciente...');
          setBattleResult('lose');
          await setPlayerFainted();
          if (isExame) navigate('/exame', { state: { examFailed: true } });
        } else {
          startPlayerTurn();
        }
      }, 700);
      timeoutRefs.current.push(timer);
      return;
    }

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

  useEffect(() => {
    const pending = resumedEnemyTurnRef.current;
    if (
      !pending ||
      !combatSessionId ||
      combatSessionId !== pending.sessionId ||
      Number(npcInit?.id) !== pending.enemyId ||
      Number(npcHP) !== pending.enemyHP ||
      battleResult
    ) return;

    resumedEnemyTurnRef.current = null;
    npcTurn(npcHP);
    // npcTurn must use the latest session and enemy state at the moment of resumption.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combatSessionId, npcInit?.id, npcHP, battleResult]);

  const handleConsumable = async (cons) => {
    if (!isPlayerTurn || battleResult || (combatSessionEligible && combatSessionLoading) || (combatSessionEligible && !combatSessionId)) return;

    // World Boss uses its own session model; until it has a dedicated potion RPC, don't
    // consume inventory items that would not update the boss session's resource state.
    if (location.state?.isWorldBoss) {
      addToast('Consumíveis ainda não estão disponíveis durante o Chefe Mundial.', 'warning');
      return;
    }

    if (!cons?.pc_id) {
      addToast('Este item não está vinculado a uma unidade do seu inventário.', 'error');
      return;
    }

    setIsPlayerTurn(false);

    if (combatSessionId) {
      const { data, error } = await supabase.rpc('usar_consumivel_combate_sessao', {
        p_player_id: player.id,
        p_session_id: combatSessionId,
        p_consumable_id: cons.id
      });
      if (error || !data?.success) {
        addToast('Não foi possível usar o consumível: ' + (error?.message || data?.error || 'operação recusada'), 'error');
        setIsPlayerTurn(true);
        return;
      }

      setPlayerHP(data.hp_remaining);
      setPlayerCP(data.chakra_remaining);
      setPlayerSt(data.stamina_remaining);
      addLog(`💊 Você usou [${cons.name}]. Recursos atualizados pelo servidor.`);
      await updatePlayer(player.id);
      npcTurn(npcHP);
      return;
    }

    // Legacy/special encounters do not maintain a server combat session. Inventory and
    // player resource changes still go through an owner-checked, atomic server RPC.
    const { data, error } = await supabase.rpc('usar_consumivel_inventario', {
      p_player_id: player.id,
      p_inventory_id: cons.pc_id
    });
    if (error || !data?.success) {
      addToast('Não foi possível usar o consumível: ' + (error?.message || data?.error || 'operação recusada'), 'error');
      setIsPlayerTurn(true);
      return;
    }

    setPlayerHP(Number(data.hp));
    setPlayerCP(Number(data.chakra));
    setPlayerSt(Number(data.stamina));
    addLog(`💊 Você usou [${cons.name}]. Recursos atualizados pelo servidor.`);
    await updatePlayer(player.id);
    npcTurn(npcHP);
  };

  const handleBasicAttack = async () => {
    if (location.state?.isWorldBoss && !npcInit?.bossSessionId) {
      addToast('Chefe mundial sem sessão validada; combate bloqueado.', 'error');
      return;
    }
    if (!isPlayerTurn || battleResult) return;
    if (combatSessionEligible && (combatSessionLoading || !combatSessionId)) {
      if (combatSessionFailed) addToast('Esta batalha não foi validada pelo servidor; ataque bloqueado.', 'error');
      return;
    }

    // COMBATE VIA SERVIDOR ATIVADO
    const USE_SERVER_COMBAT = Boolean(location.state?.isWorldBoss || combatSessionId);

    if (USE_SERVER_COMBAT) {
      setIsPlayerTurn(false);
      const isWorldBoss = Boolean(location.state?.isWorldBoss);
      const { data, error } = isWorldBoss
        ? await supabase.rpc('atacar_world_boss', {
            p_player_id: player.id,
            p_session_id: npcInit.bossSessionId,
            p_action: 'basic'
          })
        : await supabase.rpc('resolver_turno_combate_sessao', {
            p_player_id: player.id,
            p_session_id: combatSessionId,
            p_action: 'basic'
          });

      if (error || data?.error || data?.success === false) {
        const message = error?.message || data?.error || 'Falha ao resolver o ataque.';
        addToast('Erro ao resolver o ataque: ' + message, 'error');
        if (isWorldBoss && /chefe mundial|derrotado|evento terminou/i.test(message)) {
          setNpcHP(0);
          setBattleResult('world_boss_end');
        } else {
          setIsPlayerTurn(true);
        }
        return;
      }

      setPlayerSt(prev => Number.isFinite(data.stamina_remaining) ? data.stamina_remaining : prev - (data.stamina_cost || 0));

      if (!data.hit) {
        addLog(`Você usou Ataque Básico mas o inimigo esquivou!`);
        npcTurn(Number.isFinite(data.enemy_hp_remaining) ? data.enemy_hp_remaining : npcHP);
        return;
      }

      const newNpcHP = Math.max(0,
        isWorldBoss && Number.isFinite(data.boss_hp) ? data.boss_hp :
        Number.isFinite(data.enemy_hp_remaining) ? data.enemy_hp_remaining :
        npcHP - data.damage
      );
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

      if (isWorldBoss) {
        setAccumulatedDamage(prev => prev + data.damage);
        if (data.boss_defeated || newNpcHP <= 0) {
          setNpcHP(0);
          addLog('O Chefe Mundial foi derrotado! As recompensas estão sendo processadas pelo servidor.');
          setBattleResult('world_boss_end');
          return;
        }
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

    const totalAccuracy = Math.min(100, BASE_PHYSICAL_ACCURACY + (playerArmorPen / 2) - globalDebuffs.accuracyPenalty);
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
    if (location.state?.isWorldBoss && !npcInit?.bossSessionId) {
      addToast('Chefe mundial sem sessão validada; combate bloqueado.', 'error');
      return;
    }
    if (!isPlayerTurn || battleResult) return;
    if (combatSessionEligible && (combatSessionLoading || !combatSessionId)) {
      if (combatSessionFailed) addToast('Esta batalha não foi validada pelo servidor; jutsu bloqueado.', 'error');
      return;
    }

    // COMBATE VIA SERVIDOR ATIVADO
    const USE_SERVER_COMBAT = Boolean(location.state?.isWorldBoss || combatSessionId);

    if (USE_SERVER_COMBAT) {
      // Cooldown e verificação client-side UI
      const jutsuCooldown = (jutsu.cooldown || 0);
      const currentCooldown = cooldownsRef.current[jutsu.id] || 0;
      if (currentCooldown > 0) { addToast(`[${jutsu.name}] em recarga!`, 'error'); return; }

      setIsPlayerTurn(false);
      const isWorldBoss = Boolean(location.state?.isWorldBoss);
      const { data, error } = isWorldBoss
        ? await supabase.rpc('atacar_world_boss', {
            p_player_id: player.id,
            p_session_id: npcInit.bossSessionId,
            p_action: 'jutsu',
            p_jutsu_id: jutsu.id
          })
        : await supabase.rpc('resolver_turno_combate_sessao', {
            p_player_id: player.id,
            p_session_id: combatSessionId,
            p_action: 'jutsu',
            p_jutsu_id: jutsu.id
          });

      if (error || data?.error || data?.success === false) {
        const message = error?.message || data?.error || 'Falha ao resolver o jutsu.';
        addToast(message, 'error');
        if (isWorldBoss && /chefe mundial|derrotado|evento terminou/i.test(message)) {
          setNpcHP(0);
          setBattleResult('world_boss_end');
        } else {
          setIsPlayerTurn(true);
        }
        return;
      }

      const newCP = Number.isFinite(data.chakra_remaining) ? data.chakra_remaining : playerCP - data.chakra_cost;
      setPlayerCP(newCP);
      if (Number.isFinite(data.stamina_remaining)) setPlayerSt(data.stamina_remaining);

      // +1 to compensate for the immediate decrement in startPlayerTurn
      if (jutsuCooldown > 0) setCooldowns(prev => ({ ...prev, [jutsu.id]: jutsuCooldown + 1 }));

      if (newCP <= 0 && !combatSessionId) {
        addLog(`Você ficou sem Chakra usando [${jutsu.name}] e desmaiou de exaustão...`);
        setBattleResult('lose');
        setPlayerFainted();
        return;
      }

      if (!data.hit) {
        addLog(`Você usou [${jutsu.name}] mas errou! (Custou ${data.chakra_cost} CP)`);
        npcTurn(npcHP);
        return;
      }

      const newNpcHP = Math.max(0,
        isWorldBoss && Number.isFinite(data.boss_hp) ? data.boss_hp :
        Number.isFinite(data.enemy_hp_remaining) ? data.enemy_hp_remaining :
        npcHP - data.damage
      );
      setNpcHP(newNpcHP);

      playJutsuSound();
      if (data.is_crit) playCritSound();
      triggerShake('npc');
      spawnFct('npc', `-${data.damage}${data.is_crit ? ' CRÍT!' : ' MAG'}`, data.is_crit ? 'crit' : 'magic');

      addLog(`Você usou [${jutsu.name}] e causou ${data.damage} de dano! (Custou ${data.chakra_cost} CP)`);
      if (!combatSessionId) applyJutsuEffects(jutsu, true); // Sessões autoritativas não aceitam status calculado no cliente.

      if (isWorldBoss) {
        setAccumulatedDamage(prev => prev + data.damage);
        if (data.boss_defeated || newNpcHP <= 0) {
          setNpcHP(0);
          addLog('O Chefe Mundial foi derrotado! As recompensas estão sendo processadas pelo servidor.');
          setBattleResult('world_boss_end');
          return;
        }
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

    const jutsuAccuracy = jutsu.accuracy || 100;
    const totalAccuracy = Math.min(100, jutsuAccuracy + (playerPrecision / 2) - globalDebuffs.accuracyPenalty);
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
    if (combatSessionId) {
      const { data, error } = await supabase.rpc('abandonar_combate_sessao', {
        p_player_id: player.id,
        p_session_id: combatSessionId
      });
      if (error || !data?.success) {
        addToast('Não foi possível encerrar a sessão com segurança: ' + (error?.message || data?.error || 'operação recusada'), 'error');
      } else if (isExame) {
        navigate('/exame', { state: { examFailed: true } });
      }
    }
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

  const isWorldBossCombat = Boolean(location.state?.isWorldBoss);
  const combatModeEyebrow = isWorldBossCombat ? 'Incursão mundial' : isExame ? 'Exame de graduação' : isMirror ? 'Duelo ninja' : npcInit?.is_story_mode ? 'Modo história' : 'A Fúria dos Shinobis';
  const combatModeTitle = isWorldBossCombat ? 'Chefe Mundial' : isExame ? 'Prova de graduação' : isMirror ? 'Duelo de espelho' : 'Combate';
  const combatModeSubtitle = isWorldBossCombat ? 'Una estratégia e resistência para enfrentar a ameaça global.' : isExame ? 'Mostre domínio das técnicas e avance na sua graduação.' : isMirror ? 'Enfrente uma versão rival e prove a força da sua build.' : npcInit?.is_story_mode ? 'Avance na história e descubra o próximo capítulo da sua jornada.' : 'Leia o adversário, escolha suas técnicas e controle o ritmo da batalha.';
  const playerBadges = [
    clanBonus.name && (
      <div key="clan" className="badge badge-muted text-xs">Clã {clanBonus.name}</div>
    ),
    equippedSummon && (
      <div key="summon" className="badge badge-muted text-xs">🐾 {equippedSummon.name}</div>
    ),
    activeBuffs?.duration > 0 && (
      <div key="buff" className="badge badge-gold text-xs">✨ Buff [{activeBuffs.duration}T]</div>
    ),
    ...playerStatus.map(s => (
      <div key={s.name} className="badge badge-red text-xs">{s.icon || '🦠'} {s.name}</div>
    ))
  ].filter(Boolean);

  const npcBadges = [
    npcInit?.clan && (
      <div key="clan" className="badge badge-muted text-xs">Clã {npcInit.clan}</div>
    ),
    npcInit?.summon && (
      <div key="summon" className="badge badge-muted text-xs">🐾 {npcInit.summon.name}</div>
    ),
    ...npcStatus.map(s => (
      <div key={s.name} className="badge badge-red text-xs">{s.icon || '🦠'} {s.name}</div>
    ))
  ].filter(Boolean);

  return (
    <div className="page kuro-combat-page">
      <PageHeader eyebrow={combatModeEyebrow} title={combatModeTitle} subtitle={combatModeSubtitle} />

      {!battleResult && (
        <div className="combat-turn-bar kuro-combat-turn-bar">
          <div className="flex-between mb-2 text-xs">
            <span className="mono gold">
              {isPlayerTurn ? 'SEU TURNO' : 'TURNO INIMIGO'} — Rodada {roundCount}
            </span>
            {isPlayerTurn && (
              <span className={`mono ${timeLeft <= 10 ? 'danger' : 'muted'}`}>{timeLeft}s</span>
            )}
          </div>
          {isPlayerTurn && (
            <div className="progress-track bg-black-alpha-50 h-1">
              <div className={`progress-fill transition-all duration-1000 ${timeLeft <= 10 ? 'red' : 'gold'}`} style={{ width: `${(timeLeft / 30) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      <div className="flex-col w-full gap-md">

        <div className="combat-arena kuro-combat-arena">
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
            clan={player.clan}
            fighterObj={player}
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
            clan={npcInit.clan}
            fighterObj={npcInit}
          />
        </div>

        {!battleResult ? (
          isAltAutoBattle ? (
            <div className="card flex-col text-center border-dashed border-gold bg-ink kuro-auto-battle">
              <div className="text-3xl mb-2">🤖</div>
              <h3 className="gold mb-2">Modo Auto-Battle</h3>
              <p className="muted text-xs">O Wintrading Shield foi ativado. Você não pode interferir no combate contra seu próprio alter ego. O sistema resolverá a batalha com base nos atributos e na sorte de ambos.</p>
            </div>
          ) : (
            <div className="combat-actions kuro-combat-actions">
              <div className="combat-actions-header">
                <span className="mono uppercase text-xs tracking-wider text-muted">Ações</span>
                <span className="badge badge-muted">{getCombatJutsus(player).length + 1} técnicas</span>
              </div>

              <div className="combat-jutsu-section">
                <div className="flex-row gap-xs mb-3 flex-wrap justify-center">
                  {['All', 'Ninjutsu', 'Taijutsu', 'Genjutsu', 'Bukijutsu'].map(tab => {
                    const count = tab === 'All' ? getCombatJutsus(player).length : getCombatJutsus(player).filter(j => (j.category || '').toLowerCase() === tab.toLowerCase()).length;
                    if (tab !== 'All' && count === 0) return null;
                    return (
                      <button
                        key={tab}
                        className={`badge cursor-pointer border-none px-3 py-1 ${activeJutsuTab === tab ? 'badge-gold' : 'badge-muted'}`}
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
                          title={`${jutsu.name}\n${stats.cost} CP | ${stats.estDamage} DMG | ${stats.finalAcc}% ACC\nSelos req.: ${jutsu.req_seals || 0}\nCD: ${jutsu.cooldown || 0}T`}
                          type="button"
                        >
                          <div className="absolute inset-0 z-10">
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
                    <div className="info-banner flex-1 text-xs p-3 px-4 min-w-[200px]">
                      Aprenda jutsus na Academia Ninja
                    </div>
                  )}
                </div>
              </div>

              <div className="combat-secondary-actions">
                <button
                  className={`btn-ghost flex-row justify-center gap-sm text-xs ${!isPlayerTurn ? 'opacity-50' : ''} ${surrenderConfirm ? 'border-2 border-solid border-danger text-danger font-bold' : 'border border-dashed border-danger text-danger font-normal'}`}
                  disabled={!isPlayerTurn}
                  onClick={handleSurrender}
                  type="button"
                >
                  <span className="text-lg">🏳️</span>
                  {surrenderConfirm ? 'Confirmar!' : 'Desistir'}
                </button>

                <button
                  className={`btn-ghost flex-row justify-center gap-sm text-xs ${!isPlayerTurn ? 'opacity-50' : ''} ${autoBattle ? 'active border border-solid border-gold text-gold' : 'border border-solid border-line text-muted'}`}
                  onClick={() => setAutoBattle(!autoBattle)}
                  type="button"
                >
                  <span className="text-lg">🤖</span>
                  Auto: {autoBattle ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )
        ) : (
          <div className={`flex-col text-center p-6 bg-ink-soft items-center border-line-solid border kuro-combat-result ${battleResult === 'win' ? 'border-gold' : 'border-danger'}`}>
            <h2 className={`page-title mb-4 ${battleResult === 'win' ? 'gold' : 'danger'}`}>
              {battleResult === 'win' ? 'Vitória!' : (battleResult === 'world_boss_end' ? 'Fim da Incursão' : 'Inconsciente')}
            </h2>

            {battleResult === 'world_boss_end' && (
              <p className="muted mb-4">Você causou um total de <strong className="danger text-lg">{accumulatedDamage}</strong> de dano ao Chefe Global!</p>
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