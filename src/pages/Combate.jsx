import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import JutsuIcon from '../components/JutsuIcon';
import '../styles/main.css';
import {
  calculateHP,
  calculateChakra,
  calculateStamina,
  calculateAtkTaiBuk,
  calculateAtkNinGen,
  calculateDefNinGen,
  getGlobalDebuffs,
  scaleStoryNPC
} from '../utils/engine';
import {
  BASE_PHYSICAL_ACCURACY,
  getCombatJutsus,
  getClanBonus,
  getPortaoBoost,
  getJutsuCombatStats,
  getCombatBgStyle,
  getCombatHeaderMeta,
  decrementCooldownMap,
  stepActiveBuffs,
  formatVictoryRewardSummary,
  resolveWorldBossNpcAttack,
  resolveLocalBasicAttack,
  resolveLocalJutsuAttack,
  resolveLocalNpcTurnStep
} from '../utils/combatResolution';
import PageHeader from '../components/PageHeader';
import SidebarIcon from '../components/SidebarIcon';
import GameAction from '../components/ui/GameAction';
import '../styles/core-flows-v4.css';
import CombatFighterCard from '../components/CombatFighterCard';
import { getNpcPortrait, getNpcFallback } from '../utils/npcPortrait';
import CombatTurnPanel from '../components/CombatTurnPanel';
import '../styles/combat-v3.css';
import { useToast } from '../context/ToastContext';
import { playHitSound, playCritSound, playJutsuSound } from '../utils/audioEngine';

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
    if (!npcInit || !player) navigate('/dojo');
  }, [npcInit, player, navigate]);

  const clanBonus = getClanBonus(player);
  const maxPlayerHP = calculateHP(player);
  const maxPlayerCP = calculateChakra(player);
  const maxPlayerSt = calculateStamina(player);
  const playerAtkTaiBuk = calculateAtkTaiBuk(player);
  const playerDef = calculateDefNinGen(player);
  const playerPrecision = player?.precisao || player?.pre || 0;
  const playerArmorPen = (player?.tai || 0) / 10;
  const portaoAtkMultiplier = getPortaoBoost(player);

  const npcMaxHP = npcInit?.hp || 1;
  const npcMaxCP = Math.max(0, Number(npcInit?.chakra ?? 0));
  const npcMaxSt = 100;
  const npcAtkTaiBuk = isMirror ? calculateAtkTaiBuk(npcInit) : (npcInit?.atk || 0);
  const npcAtkNinGen = isMirror ? calculateAtkNinGen(npcInit) : (npcInit?.atk || 0);
  const npcDef = isMirror ? calculateDefNinGen(npcInit) : (npcInit?.def || 0);

  const [playerHP, setPlayerHP] = useState(player.hp !== undefined && player.hp !== null ? Math.min(player.hp, maxPlayerHP) : maxPlayerHP);
  const [playerCP, setPlayerCP] = useState(player.chakra !== undefined && player.chakra !== null ? Math.min(player.chakra, maxPlayerCP) : maxPlayerCP);
  const [playerSt, setPlayerSt] = useState(player.stamina !== undefined && player.stamina !== null ? Math.min(player.stamina, maxPlayerSt) : maxPlayerSt);
  const [npcHP, setNpcHP] = useState(npcInit?.hp || 1);
  const [, setNpcMaxHPVal] = useState(npcInit?.hp || 1);
  const [npcCP, setNpcCP] = useState(Math.max(0, Number(npcInit?.chakra ?? 0)));
  const [npcSt, setNpcSt] = useState(npcMaxSt);

  const timeoutRefs = useRef([]);
  const turnActionInFlightRef = useRef(false);
  const scheduleTimeout = (callback, delayMs) => {
    const id = setTimeout(callback, delayMs);
    timeoutRefs.current.push(id);
    return id;
  };
  useEffect(() => () => timeoutRefs.current.forEach(clearTimeout), []);

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
  const [fcts, setFcts] = useState([]);
  const [playerShake, setPlayerShake] = useState(false);
  const [npcShake, setNpcShake] = useState(false);

  const spawnFct = (target, text, type) => {
    const id = Date.now() + Math.random();
    setFcts(prev => [...prev, { id, target, text, type }]);
    scheduleTimeout(() => setFcts(prev => prev.filter(f => f.id !== id)), 1200);
  };
  const triggerShake = (target) => {
    if (target === 'player') {
      setPlayerShake(true);
      scheduleTimeout(() => setPlayerShake(false), 400);
    } else {
      setNpcShake(true);
      scheduleTimeout(() => setNpcShake(false), 400);
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
  const [showCombatLog, setShowCombatLog] = useState(true);
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
  const [raidCurrent] = useState(location.state?.raidCurrent ?? 0);
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

  const addLog = (msg) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
    if (!combatSessionEligible || combatSessionStartRef.current) return;
    combatSessionStartRef.current = true;
    setCombatSessionLoading(true);

    const startSession = async () => {
      const { data, error } = isExame
        ? await supabase.rpc('iniciar_exame_chunin', { p_player_id: player.id, p_round: Number(location.state?.exameRound) })
        : await supabase.rpc('iniciar_combate_sessao', {
            p_player_id: player.id,
            p_enemy_id: Number(npcInit.id),
            p_from_map: Boolean(location.state?.fromMap),
            p_is_dojo: !location.state?.fromMap && !location.state?.isStoryQuest && !npcInit?.is_story_mode && !npcInit?.is_bingo_book && !location.state?.isBetrayal
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
          resumedEnemyTurnRef.current = { sessionId: data.session_id, enemyId: Number(data.enemy_id), enemyHP: Number(data.enemy_hp) };
          setIsPlayerTurn(false);
        } else {
          turnActionInFlightRef.current = false;
          setIsPlayerTurn(true);
          setTimeLeft(30);
        }
      }
      setNpcHP(data.enemy_hp);
      setNpcMaxHPVal(data.enemy_max_hp);
      setNpcCP(data.enemy_chakra);
      setNpcInit(prev => ({
        ...prev,
        id: data.enemy_id, name: data.enemy_name, level: data.enemy_level,
        hp: data.enemy_max_hp, atk: data.enemy_atk, def: data.enemy_def,
        chakra: data.enemy_chakra, element: data.enemy_element,
        xp_reward: data.xp_reward, ryou_reward: data.ryou_reward
      }));
      setPlayerHP(data.player_hp);
      setPlayerCP(data.player_chakra);
      setPlayerSt(data.player_stamina);
      setPlayerState?.(prev => prev ? { ...prev, hp: data.player_hp, chakra: data.player_chakra, stamina: data.player_stamina } : prev);

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
    npcInit?.is_bingo_book, addToast, setPlayerState, isExame
  ]);

  useEffect(() => {
    async function fetchSummon() {
      if (!player?.id) return;
      const { data } = await supabase.from('player_summons').select('*, summons(*)').eq('player_id', player.id).eq('is_equipped', true).limit(1).maybeSingle();
      setEquippedSummon(data ? data.summons : null);
    }
    fetchSummon();
  }, [player?.id]);

  useEffect(() => {
    async function checkGlobalDebuffs() {
      if (location.state?.isWorldBoss) {
        setGlobalDebuffs(getGlobalDebuffs(npcInit));
        return;
      }
      const { data } = await supabase.from('global_events').select('*').eq('is_active', true).eq('is_world_boss', true).limit(1).maybeSingle();
      setGlobalDebuffs(getGlobalDebuffs(data || null));
    }
    checkGlobalDebuffs();
  }, [location.state, npcInit]);

  useEffect(() => {
    if (logsContainerRef.current) logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (setPlayerState) setPlayerState(prev => prev ? { ...prev, hp: playerHP, chakra: playerCP } : prev);
  }, [playerHP, playerCP, setPlayerState]);

  useEffect(() => {
    let timer;
    if (isPlayerTurn && !battleResult && !isAltAutoBattle &&
        (!combatSessionEligible || (!combatSessionLoading && !combatSessionFailed && Boolean(combatSessionId)))) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            if (turnActionInFlightRef.current) return 0;
            turnActionInFlightRef.current = true;
            addLog('Tempo esgotado! Você perdeu a vez.');
            setIsPlayerTurn(false);
            if (combatSessionId) {
              supabase.rpc('resolver_turno_combate_sessao', {
                p_player_id: player.id, p_session_id: combatSessionId, p_action: 'pass'
              }).then(({ data, error }) => {
                if (error || !data?.success) {
                  addToast('O servidor não confirmou a perda de turno: ' + (error?.message || data?.error || 'operação recusada'), 'error');
                  turnActionInFlightRef.current = false;
                  setIsPlayerTurn(true);
                  setTimeLeft(30);
                  return;
                }
                npcTurn(Number.isFinite(data.enemy_hp_remaining) ? data.enemy_hp_remaining : npcHP);
              }).catch(error => {
                addToast('Erro ao resolver o turno: ' + (error?.message || 'erro inesperado'), 'error');
                turnActionInFlightRef.current = false;
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
  }, [isPlayerTurn, battleResult, npcHP, isAltAutoBattle,
    combatSessionEligible, combatSessionId, combatSessionLoading, combatSessionFailed, player?.id]);

  useEffect(() => {
    let timer;
    if (isAltAutoBattle && !battleResult) {
      timer = setTimeout(() => {
        const pPower = ((player?.level || 1) * 150) + ((player?.pontos_atributos || 0) * 50);
        const nPower = ((npcInit?.level || 1) * 150) + 1000;
        if (Math.random() < pPower / (pPower + nPower)) {
          setNpcHP(0);
          addLog('🤖 Wintrading Shield: O seu Alter Ego venceu a batalha contra o invasor!');
          setBattleResult('win');
          handleWin();
        } else {
          setPlayerHP(0);
          addLog('🤖 Wintrading Shield: O invasor foi muito forte e derrotou o seu Alter Ego...');
          setBattleResult('lose');
          setPlayerFainted();
        }
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [isAltAutoBattle, battleResult]);

  useEffect(() => {
    let timer;
    if (isPlayerTurn && autoBattle && !battleResult && !isAltAutoBattle &&
        (!combatSessionEligible || (!combatSessionLoading && !combatSessionFailed && Boolean(combatSessionId)))) {
      timer = setTimeout(() => {
        const availableJutsus = getCombatJutsus(player).filter(j => {
          const stats = getJutsuCombatStats(j, player, npcDef, cooldownsRef.current);
          return !stats.isOnCooldown && playerCP >= stats.cost;
        });
        if (availableJutsus.length > 0 && Math.random() > 0.4) {
          handleJutsu(availableJutsus[Math.floor(Math.random() * availableJutsus.length)]);
        } else {
          handleBasicAttack();
        }
      }, 1000);
    }
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayerTurn, autoBattle, combatSessionEligible, combatSessionId,
    combatSessionLoading, combatSessionFailed, battleResult, isAltAutoBattle]);

  const applyJutsuEffects = (jutsu, toNpc = true) => {
    if (!jutsu?.jutsu_effects?.length) return;
    jutsu.jutsu_effects.forEach(eff => {
      const statusDef = eff.status_effects;
      if (!statusDef) return;
      const newStatus = { name: statusDef.name, type: statusDef.type, icon: statusDef.icon, duration: statusDef.duration, base_value: statusDef.base_value };
      if (toNpc) {
        setNpcStatus(prev => [...prev.filter(s => s.name !== newStatus.name), newStatus]);
        addLog(`🦠 Inimigo sofreu [${newStatus.name}] por ${newStatus.duration} turnos.`);
      } else {
        setPlayerStatus(prev => [...prev.filter(s => s.name !== newStatus.name), newStatus]);
        addLog(`🦠 Você sofreu [${newStatus.name}] por ${newStatus.duration} turnos.`);
      }
    });
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
      addToast('Esta batalha não possui uma sessão validada pelo servidor; recompensas e progresso foram bloqueados.', 'info');
    }

    const hasVerifiedWin = Boolean(combatSessionId && !resultError && resultData?.success && resultData?.session_settled);
    if (hasVerifiedWin && resultData?.is_exam === true) {
      await updatePlayer(player.id);
      navigate('/exame', { state: { roundWon: Number(resultData.exam_round_completed) } });
      setLoading(false);
      return;
    }

    if (updatePlayer) await updatePlayer(player.id);
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
      const { mainToast, levelToast } = formatVictoryRewardSummary(resultData);
      addToast(mainToast, 'success');
      if (levelToast) addToast(levelToast, 'success');
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

  handleWinRecoveryRef.current = handleWin;
  useEffect(() => {
    if (!pendingVictoryRecoveryRef.current || !combatSessionId || battleResult !== 'win') return;
    pendingVictoryRecoveryRef.current = false;
    handleWinRecoveryRef.current?.();
  }, [combatSessionId, battleResult]);

  const handleWorldBossEnd = async () => {
    setLoading(true);
    if (npcInit?.bossSessionId) {
      const { data, error } = await supabase.rpc('encerrar_world_boss', { p_player_id: player.id, p_session_id: npcInit.bossSessionId });
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
    const { data, error } = await supabase.rpc('marcar_jogador_derrotado', { p_player_id: player.id });
    if (error || !data?.success) {
      addToast('Não foi possível registrar a derrota: ' + (error?.message || data?.error || 'operação recusada'), 'error');
    }
    await updatePlayer(player.id);
  };

  const startPlayerTurn = () => {
    if (npcTurnCompletedRef.current) setRoundCount(r => r + 1);
    else npcTurnCompletedRef.current = true;

    setCooldowns(decrementCooldownMap);
    setNpcCooldowns(decrementCooldownMap);
    setActiveBuffs(prev => {
      const { next, expired } = stepActiveBuffs(prev);
      if (expired) addLog('Seus buffs ativos se esgotaram!');
      return next;
    });

    if (equippedSummon?.name?.includes('Katsuyu')) {
      const healAmt = Math.floor(maxPlayerHP * 0.05);
      setPlayerHP(prev => Math.min(maxPlayerHP, prev + healAmt));
      addLog(`🐌 ${equippedSummon.name} restaurou ${healAmt} do seu HP!`);
      spawnFct('player', `+${healAmt}`, 'heal');
    }

    if (!combatSessionId && playerCP < 10 && playerSt < 10 && npcCP < 10 && npcSt < 10) {
      addLog('⚔️ EMPATE POR EXAUSTÃO: Nenhum dos ninjas possui Chakra ou Stamina para continuar a luta!');
      setBattleResult('lose');
      setPlayerFainted();
      return;
    }

    turnActionInFlightRef.current = false;
    setIsPlayerTurn(true);
    setTimeLeft(30);
  };

  const npcTurn = (currentNpcHP) => {
    if (currentNpcHP <= 0) return;

    if (combatSessionId && !location.state?.isWorldBoss) {
      scheduleTimeout(async () => {
        addLog(`${npcInit.name} está respondendo ao seu turno...`);
        const { data, error } = await supabase.rpc('responder_turno_combate_sessao', { p_player_id: player.id, p_session_id: combatSessionId });
        if (error || !data?.success) {
          addToast('Erro ao resolver o turno inimigo: ' + (error?.message || data?.error || 'operação recusada'), 'error');
          turnActionInFlightRef.current = false;
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
      return;
    }

    scheduleTimeout(() => {
      addLog(`${npcInit.name} está atacando...`);
      scheduleTimeout(() => {
        if (npcInit.is_dummy) {
          addLog('🪵 O Boneco de Madeira apenas balança com o vento...');
          startPlayerTurn();
          return;
        }

        if (location.state?.isWorldBoss) {
          const wb = resolveWorldBossNpcAttack({
            npcAtkTaiBuk, turnCount, playerDef,
            npcElement: npcInit.element, playerElement: player.element,
            playerHP, npcName: npcInit.name
          });
          wb.logs.forEach(addLog);
          setPlayerHP(wb.nextPlayerHP);
          if (wb.obliterated) {
            setBattleResult('world_boss_end');
            return;
          }
          playHitSound();
          triggerShake('player');
          spawnFct('player', `-${wb.damage}`, 'damage');
          setTurnCount(t => t + 1);
          if (wb.nextPlayerHP <= 0) setBattleResult('world_boss_end');
          else startPlayerTurn();
          return;
        }

        const outcome = resolveLocalNpcTurnStep({
          currentNpcHP, npcInit, npcCP, npcSt, npcAtkTaiBuk, npcAtkNinGen,
          player, playerDef, playerHP: playerHPRef.current, activeBuffs,
          npcStatusList: npcStatusRef.current, playerStatusList: playerStatusRef.current,
          npcCooldowns: npcCooldownsRef.current
        });
        outcome.logs.forEach(addLog);
        setNpcHP(outcome.nextNpcHP);
        setNpcStatus(outcome.nextNpcStatus);

        if (outcome.npcDefeatedByDot) {
          setBattleResult('win');
          handleWin();
          return;
        }
        if (outcome.stunned) {
          startPlayerTurn();
          return;
        }

        setNpcCP(outcome.nextNpcCP);
        setNpcSt(outcome.nextNpcSt);
        setNpcCooldowns(outcome.nextNpcCooldowns);
        if (outcome.usedJutsu && outcome.chosenJutsu) applyJutsuEffects(outcome.chosenJutsu, false);
        setPlayerHP(outcome.nextPlayerHP);

        if (outcome.damage > 0) {
          triggerShake('player');
          if (outcome.usedJutsu) {
            playJutsuSound();
            spawnFct('player', `-${outcome.damage} MAG`, 'magic');
          } else {
            playHitSound();
            spawnFct('player', `-${outcome.damage}`, 'damage');
          }
        }

        if (outcome.nextPlayerHP <= 0) {
          setBattleResult('lose');
          setPlayerFainted();
        } else {
          startPlayerTurn();
        }
      }, 1000);
    }, 1000);
  };

  useEffect(() => {
    const pending = resumedEnemyTurnRef.current;
    if (!pending || !combatSessionId || combatSessionId !== pending.sessionId ||
        Number(npcInit?.id) !== pending.enemyId || Number(npcHP) !== pending.enemyHP || battleResult) return;
    resumedEnemyTurnRef.current = null;
    npcTurn(npcHP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combatSessionId, npcInit?.id, npcHP, battleResult]);

  const finishTurnAfterDamage = (newNpcHP, damage, isWorldBoss, bossDefeated, winLog) => {
    if (isWorldBoss) {
      setAccumulatedDamage(prev => prev + damage);
      if (bossDefeated || newNpcHP <= 0) {
        setNpcHP(0);
        addLog('O Chefe Mundial foi derrotado! As recompensas estão sendo processadas pelo servidor.');
        setBattleResult('world_boss_end');
        return;
      }
      npcTurn(newNpcHP);
      return;
    }
    if (newNpcHP <= 0) {
      addLog(winLog);
      setBattleResult('win');
      handleWin();
    } else {
      npcTurn(newNpcHP);
    }
  };

  const handleBasicAttack = async () => {
    if (location.state?.isWorldBoss && !npcInit?.bossSessionId) {
      addToast('Chefe mundial sem sessão validada; combate bloqueado.', 'error');
      return;
    }
    if (!isPlayerTurn || battleResult || turnActionInFlightRef.current) return;
    if (combatSessionEligible && (combatSessionLoading || !combatSessionId)) {
      if (combatSessionFailed) addToast('Esta batalha não foi validada pelo servidor; ataque bloqueado.', 'error');
      return;
    }

    if (location.state?.isWorldBoss || combatSessionId) {
      turnActionInFlightRef.current = true;
      setIsPlayerTurn(false);
      const isWorldBoss = Boolean(location.state?.isWorldBoss);
      const { data, error } = isWorldBoss
        ? await supabase.rpc('atacar_world_boss', { p_player_id: player.id, p_session_id: npcInit.bossSessionId, p_action: 'basic' })
        : await supabase.rpc('resolver_turno_combate_sessao', { p_player_id: player.id, p_session_id: combatSessionId, p_action: 'basic' });

      if (error || data?.error || data?.success === false) {
        const message = error?.message || data?.error || 'Falha ao resolver o ataque.';
        addToast('Erro ao resolver o ataque: ' + message, 'error');
        if (isWorldBoss && /chefe mundial|derrotado|evento terminou/i.test(message)) {
          setNpcHP(0);
          setBattleResult('world_boss_end');
        } else {
          turnActionInFlightRef.current = false;
          setIsPlayerTurn(true);
        }
        return;
      }

      setPlayerSt(prev => Number.isFinite(data.stamina_remaining) ? data.stamina_remaining : prev - (data.stamina_cost || 0));
      if (!data.hit) {
        addLog('Você usou Ataque Básico mas o inimigo esquivou!');
        npcTurn(Number.isFinite(data.enemy_hp_remaining) ? data.enemy_hp_remaining : npcHP);
        return;
      }

      const newNpcHP = Math.max(0, isWorldBoss && Number.isFinite(data.boss_hp) ? data.boss_hp : Number.isFinite(data.enemy_hp_remaining) ? data.enemy_hp_remaining : npcHP - data.damage);
      setNpcHP(newNpcHP);
      if (data.is_crit) {
        playCritSound();
        spawnFct('npc', `-${data.damage} CRIT!`, 'crit');
      } else {
        playHitSound();
        spawnFct('npc', `-${data.damage}`, 'damage');
      }
      triggerShake('npc');
      addLog(`Você usou Ataque Básico e causou ${data.damage} de dano!${data.is_crit ? ' 👁️ CRÍTICO!' : ''}`);

      if (data.paralyzed) {
        addLog('🌑 Sombra Nara: inimigo paralisado! Turno extra ganho.');
        turnActionInFlightRef.current = false;
        setIsPlayerTurn(true);
        setTimeLeft(30);
        return;
      }
      finishTurnAfterDamage(newNpcHP, data.damage, isWorldBoss, data.boss_defeated, `Vitória! Você derrotou ${npcInit.name}.`);
      return;
    }

    const localOutcome = resolveLocalBasicAttack({
      player, npcHP, npcDef, playerSt, playerAtkTaiBuk, playerArmorPen,
      portaoAtkMultiplier, globalDebuffs, clanBonus, activeBuffs, equippedSummon
    });
    if (localOutcome.errorToast) {
      addToast(localOutcome.errorToast, 'error');
      return;
    }

    turnActionInFlightRef.current = true;
    setIsPlayerTurn(false);
    setPlayerSt(localOutcome.nextStamina);
    localOutcome.logs.forEach(addLog);
    if (!localOutcome.hit) {
      npcTurn(npcHP);
      return;
    }

    setNpcHP(localOutcome.nextNpcHP);
    if (localOutcome.isCrit) {
      playCritSound();
      spawnFct('npc', `-${localOutcome.damage} CRIT!`, 'crit');
    } else {
      playHitSound();
      spawnFct('npc', `-${localOutcome.damage}`, 'damage');
    }
    triggerShake('npc');

    if (localOutcome.paralyzed) {
      turnActionInFlightRef.current = false;
      setIsPlayerTurn(true);
      setTimeLeft(30);
      return;
    }
    finishTurnAfterDamage(localOutcome.nextNpcHP, localOutcome.damage, Boolean(location.state?.isWorldBoss), false, `Vitória! Você derrotou ${npcInit.name}.`);
  };

  const handleJutsu = async (jutsu) => {
    if (location.state?.isWorldBoss && !npcInit?.bossSessionId) {
      addToast('Chefe mundial sem sessão validada; combate bloqueado.', 'error');
      return;
    }
    if (!isPlayerTurn || battleResult || turnActionInFlightRef.current) return;
    if (combatSessionEligible && (combatSessionLoading || !combatSessionId)) {
      if (combatSessionFailed) addToast('Esta batalha não foi validada pelo servidor; jutsu bloqueado.', 'error');
      return;
    }

    if (location.state?.isWorldBoss || combatSessionId) {
      const jutsuCooldown = jutsu.cooldown || 0;
      if ((cooldownsRef.current[jutsu.id] || 0) > 0) {
        addToast(`[${jutsu.name}] em recarga!`, 'error');
        return;
      }

      turnActionInFlightRef.current = true;
      setIsPlayerTurn(false);
      const isWorldBoss = Boolean(location.state?.isWorldBoss);
      const { data, error } = isWorldBoss
        ? await supabase.rpc('atacar_world_boss', { p_player_id: player.id, p_session_id: npcInit.bossSessionId, p_action: 'jutsu', p_jutsu_id: jutsu.id })
        : await supabase.rpc('resolver_turno_combate_sessao', { p_player_id: player.id, p_session_id: combatSessionId, p_action: 'jutsu', p_jutsu_id: jutsu.id });

      if (error || data?.error || data?.success === false) {
        const message = error?.message || data?.error || 'Falha ao resolver o jutsu.';
        addToast(message, 'error');
        if (isWorldBoss && /chefe mundial|derrotado|evento terminou/i.test(message)) {
          setNpcHP(0);
          setBattleResult('world_boss_end');
        } else {
          turnActionInFlightRef.current = false;
          setIsPlayerTurn(true);
        }
        return;
      }

      const newCP = Number.isFinite(data.chakra_remaining) ? data.chakra_remaining : playerCP - data.chakra_cost;
      setPlayerCP(newCP);
      if (Number.isFinite(data.stamina_remaining)) setPlayerSt(data.stamina_remaining);
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

      const newNpcHP = Math.max(0, isWorldBoss && Number.isFinite(data.boss_hp) ? data.boss_hp : Number.isFinite(data.enemy_hp_remaining) ? data.enemy_hp_remaining : npcHP - data.damage);
      setNpcHP(newNpcHP);
      playJutsuSound();
      if (data.is_crit) playCritSound();
      triggerShake('npc');
      spawnFct('npc', `-${data.damage}${data.is_crit ? ' CRÍT!' : ' MAG'}`, data.is_crit ? 'crit' : 'magic');
      addLog(`Você usou [${jutsu.name}] e causou ${data.damage} de dano! (Custou ${data.chakra_cost} CP)`);
      if (!combatSessionId) applyJutsuEffects(jutsu, true);

      finishTurnAfterDamage(newNpcHP, data.damage, isWorldBoss, data.boss_defeated, `Vitória magistral! Você derrotou ${npcInit.name}.`);
      return;
    }

    const localOutcome = resolveLocalJutsuAttack({
      jutsu, player, npcInit, npcHP, npcDef, playerCP, playerPrecision,
      globalDebuffs, activeBuffs, equippedSummon, cooldowns: cooldownsRef.current
    });
    if (localOutcome.errorToast) {
      addToast(localOutcome.errorToast, 'error');
      return;
    }

    turnActionInFlightRef.current = true;
    setIsPlayerTurn(false);
    setPlayerCP(localOutcome.nextCP);
    if (localOutcome.nextCooldownValue > 0) {
      setCooldowns(prev => ({ ...prev, [jutsu.id]: localOutcome.nextCooldownValue }));
    }
    localOutcome.logs.forEach(addLog);

    if (localOutcome.exhaustedChakra) {
      setBattleResult('lose');
      setPlayerFainted();
      return;
    }
    if (!localOutcome.hit) {
      npcTurn(npcHP);
      return;
    }

    setNpcHP(localOutcome.nextNpcHP);
    if (localOutcome.nextBuffs) setActiveBuffs(localOutcome.nextBuffs);
    playJutsuSound();
    if (localOutcome.isCrit) playCritSound();
    triggerShake('npc');
    spawnFct('npc', `-${localOutcome.damage}${localOutcome.isCrit ? ' CRÍT!' : ' MAG'}`, localOutcome.isCrit ? 'crit' : localOutcome.mult > 1 ? 'crit' : 'magic');
    applyJutsuEffects(jutsu, true);

    finishTurnAfterDamage(localOutcome.nextNpcHP, localOutcome.damage, Boolean(location.state?.isWorldBoss), false, `Vitória magistral! Você derrotou ${npcInit.name}.`);
  };

  const handleSurrender = async () => {
    if (!surrenderConfirm) {
      addToast('Clique novamente em Desistir para confirmar.', 'info');
      setSurrenderConfirm(true);
      scheduleTimeout(() => setSurrenderConfirm(false), 4000);
      return;
    }
    if (combatSessionEligible && (combatSessionLoading || !combatSessionId || combatSessionFailed)) {
      addToast('Aguarde a validação da sessão antes de desistir.', 'warning');
      return;
    }
    if (turnActionInFlightRef.current) return;
    turnActionInFlightRef.current = true;
    setSurrenderConfirm(false);
    addLog('Você encerrou esta batalha.');
    if (npcInit?.is_dummy) {
      setBattleResult('training_end');
      return;
    }
    setBattleResult('surrender');
    if (combatSessionId) {
      const { data, error } = await supabase.rpc('abandonar_combate_sessao', { p_player_id: player.id, p_session_id: combatSessionId });
      if (error || !data?.success) {
        addToast('Não foi possível encerrar a sessão com segurança: ' + (error?.message || data?.error || 'operação recusada'), 'error');
      } else if (isExame) {
        navigate('/exame', { state: { examFailed: true } });
      }
    }
    await setPlayerFainted();
  };

  if (!player || !npcInit) {
    return (
      <div className="page">
        <PageHeader eyebrow="Erro" title="Combate" />
        <div className="card">Dados do combate perdidos ou não inicializados. Retorne ao menu principal.</div>
      </div>
    );
  }

  const pHPPercent = (playerHP / maxPlayerHP) * 100;
  const pCPPercent = (playerCP / maxPlayerCP) * 100;
  const pStPercent = (playerSt / maxPlayerSt) * 100;
  const nHPPercent = (npcHP / npcMaxHP) * 100;
  const nCPPercent = npcMaxCP > 0 ? (npcCP / npcMaxCP) * 100 : 0;
  const nStPercent = (npcSt / npcMaxSt) * 100;
  const combatBg = (villageId) => getCombatBgStyle(location.state?.bgType, villageId);
  const { eyebrow: combatModeEyebrow, title: combatModeTitle, subtitle: combatModeSubtitle } = getCombatHeaderMeta({
    isWorldBossCombat: Boolean(location.state?.isWorldBoss), isExame, isMirror, isStoryMode: Boolean(npcInit?.is_story_mode)
  });

  const playerBadges = [
    clanBonus.name && <div key="clan" className="badge badge-muted text-xs">Clã {clanBonus.name}</div>,
    equippedSummon && <div key="summon" className="badge badge-muted text-xs">🐾 {equippedSummon.name}</div>,
    activeBuffs?.duration > 0 && <div key="buff" className="badge badge-gold text-xs">✨ Buff [{activeBuffs.duration}T]</div>,
    ...playerStatus.map(s => <div key={s.name} className="badge badge-red text-xs">{s.icon || '🦠'} {s.name}</div>)
  ].filter(Boolean);

  const blockedByServer = combatSessionEligible && (combatSessionLoading || !combatSessionId);
  const npcBadges = [
    npcInit?.clan && <div key="clan" className="badge badge-muted text-xs">Clã {npcInit.clan}</div>,
    npcInit?.summon && <div key="summon" className="badge badge-muted text-xs">🐾 {npcInit.summon.name}</div>,
    ...npcStatus.map(s => <div key={s.name} className="badge badge-red text-xs">{s.icon || '🦠'} {s.name}</div>)
  ].filter(Boolean);

  return (
    <div className="page kuro-combat-page kuro-combat-v4">
      <PageHeader eyebrow={combatModeEyebrow} title={combatModeTitle} subtitle={combatModeSubtitle} />

      {!battleResult && (
        <CombatTurnPanel
          round={roundCount}
          isPlayerTurn={isPlayerTurn}
          remainingSeconds={timeLeft}
          sessionPending={combatSessionEligible && combatSessionLoading}
          sessionFailed={combatSessionEligible && combatSessionFailed}
          autoBattle={isAltAutoBattle || autoBattle}
        />
      )}

      <div className="flex-col w-full gap-md">
        <div className="combat-arena kuro-combat-arena">
          <CombatFighterCard
            side="left"
            shake={playerShake}
            fcts={fcts.filter(f => f.target === 'player')}
            bgStyle={combatBg(player.village_id)}
            portrait={player.avatar || '忍'}
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
            {raidTotal > 0 && <div className="badge badge-gold combat-raid-badge">Incursão {raidCurrent}/{raidTotal}</div>}
            <div className="kuro-combat-v3__log-heading">
              <strong><SidebarIcon name="scroll" size={16} /> Registro de combate <span className="muted mono">({logs.length})</span></strong>
              <button
                type="button"
                className="kuro-combat-v3__log-toggle"
                onClick={() => setShowCombatLog(value => !value)}
                aria-expanded={showCombatLog}
                aria-controls="combat-log-events"
              >
                {showCombatLog ? 'Ocultar eventos' : 'Mostrar eventos'}
              </button>
            </div>
            <div
              id="combat-log-events"
              className="combat-log combat-log-center kuro-combat-v3__log"
              ref={logsContainerRef}
              aria-label="Eventos do combate"
              role="log"
              aria-live="off"
              hidden={!showCombatLog}
            >
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className="combat-log-line"
                  data-type={
                    log.includes('Você usou') || log.includes('Você causou') ? 'player'
                      : log.includes('causou') || log.includes('atacou') || log.includes('usou [') ? 'enemy' : 'neutral'
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
            portrait={getNpcPortrait(npcInit) || getNpcFallback(npcInit)}
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
              <div className="kuro-combat-v4__auto-icon"><SidebarIcon name="activity" size={31} /></div>
              <h3 className="gold mb-2">Modo Auto-Battle</h3>
              <p className="muted text-xs">O Wintrading Shield foi ativado. Você não pode interferir no combate contra seu próprio alter ego. O sistema resolverá a batalha com base nos atributos e na sorte de ambos.</p>
            </div>
          ) : (
            <div className="combat-actions kuro-combat-actions kuro-combat-v3__actions">
              <div className="combat-actions-header">
                <div>
                  <span className="mono uppercase text-xs tracking-wider text-muted">Ações do ninja</span>
                  <p className="kuro-combat-v3__actions-note">Confira o custo e a recarga antes de agir.</p>
                </div>
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
                        className={`kuro-combat-v4__tech-tab ${activeJutsuTab === tab ? 'is-active' : ''}`}
                        type="button"
                        aria-pressed={activeJutsuTab === tab}
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
                    disabled={!isPlayerTurn || blockedByServer || loading}
                    onClick={handleBasicAttack}
                    title={`Ataque Básico\n${Math.max(1, Math.floor(playerAtkTaiBuk * portaoAtkMultiplier) - Math.floor(npcDef / 2))} DMG | ${BASE_PHYSICAL_ACCURACY + (playerArmorPen / 2) - globalDebuffs.accuracyPenalty}% ACC`}
                    type="button"
                  >
                    <span className="combat-basic-icon"><SidebarIcon name="swords" size={23} /></span>
                    <span className="jutsu-name">Básico</span>
                    <span className="jutsu-cost">{Math.max(1, Math.floor(playerAtkTaiBuk * portaoAtkMultiplier) - Math.floor(npcDef / 2))} DMG</span>
                  </button>

                  {getCombatJutsus(player)
                    .filter(jutsu => activeJutsuTab === 'All' || (jutsu.category || '').toLowerCase() === activeJutsuTab.toLowerCase())
                    .map((jutsu) => {
                      const stats = getJutsuCombatStats(jutsu, player, npcDef, cooldowns);
                      return (
                        <button
                          key={jutsu.id}
                          className={`combat-jutsu-btn ${stats.isOnCooldown ? 'on-cooldown' : ''} ${stats.hasEssences ? 'enhanced' : ''}`}
                          disabled={!isPlayerTurn || stats.isOnCooldown || blockedByServer || loading}
                          onClick={() => handleJutsu(jutsu)}
                          aria-label={`${jutsu.name}, custo ${stats.cost} de Chakra, dano estimado ${stats.estDamage}, ${stats.jutsuCdVal > 0 ? 'recarga de ' + stats.jutsuCdVal + ' turnos' : 'pronto'}`}
                          aria-disabled={!isPlayerTurn || stats.isOnCooldown || blockedByServer || loading}
                          title={`${jutsu.name}\n${stats.cost} CP | ${stats.estDamage} DMG | ${stats.finalAcc}% ACC\nSelos req.: ${jutsu.req_seals || 0}\nCD: ${jutsu.cooldown || 0}T`}
                          type="button"
                        >
                          <div className="absolute inset-0 z-10"><JutsuIcon jutsu={jutsu} /></div>
                          {stats.isOnCooldown && <div className="jutsu-cd-overlay">{stats.jutsuCdVal}</div>}
                          <span className="jutsu-name">{jutsu.name}</span>
                          <span className="jutsu-cost">{stats.cost} CP</span>
                          <span className="jutsu-level">Lv.{stats.jutsuLevel}</span>
                          <span className="kuro-combat-v3__action-status">
                            {stats.jutsuCdVal > 0 ? 'CD: ' + stats.jutsuCdVal + ' turno(s)' : 'Pronto'}
                          </span>
                        </button>
                      );
                    })}

                  {getCombatJutsus(player).length === 0 && (
                    <div className="info-banner flex-1 text-xs p-3 px-4 min-w-[200px]">Aprenda jutsus na Academia Ninja</div>
                  )}
                </div>
              </div>

              <div className="combat-secondary-actions">
                <button
                  className={`btn-ghost flex-row justify-center gap-sm text-xs ${!isPlayerTurn ? 'opacity-50' : ''} ${surrenderConfirm ? 'border-2 border-solid border-danger text-danger font-bold' : 'border border-dashed border-danger text-danger font-normal'}`}
                  disabled={!isPlayerTurn || blockedByServer || loading}
                  onClick={handleSurrender}
                  type="button"
                >
                  <span className="text-lg"><SidebarIcon name="shield" size={19} /></span>
                  {surrenderConfirm ? 'Confirmar!' : 'Desistir'}
                </button>

                <button
                  className={`btn-ghost flex-row justify-center gap-sm text-xs ${!isPlayerTurn ? 'opacity-50' : ''} ${autoBattle ? 'active border border-solid border-gold text-gold' : 'border border-solid border-line text-muted'}`}
                  onClick={() => setAutoBattle(!autoBattle)}
                  type="button"
                >
                  <span className="text-lg"><SidebarIcon name="activity" size={19} /></span>
                  Auto: {autoBattle ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )
        ) : (
          <div className={`flex-col text-center p-6 bg-ink-soft items-center border-line-solid border kuro-combat-result ${battleResult === 'win' ? 'border-gold' : 'border-danger'}`}>
            <h2 className={`page-title mb-4 ${battleResult === 'win' ? 'gold' : 'danger'}`}>
              {battleResult === 'win' ? 'Vitória!' : (battleResult === 'world_boss_end' ? 'Fim da Incursão' : battleResult === 'training_end' ? 'Treino encerrado' : 'Inconsciente')}
            </h2>

            {battleResult === 'world_boss_end' && (
              <p className="muted mb-4">Você causou um total de <strong className="danger text-lg">{accumulatedDamage}</strong> de dano ao Chefe Global!</p>
            )}

            <GameAction tone="seal" loading={loading} onClick={battleResult === 'world_boss_end' ? handleWorldBossEnd : () => navigate(battleResult === 'win' ? (location.state?.isExame ? '/exame' : (location.state?.fromMap ? '/mapa' : '/dojo')) : (location.state?.isExame ? '/exame' : (battleResult === 'training_end' ? '/dojo' : '/hospital')), { state: { roundWon: battleResult === 'win' ? location.state?.exameRound : null } })}>
              <SidebarIcon name="arrowRight" size={17} />
              <span>{loading ? 'Retornando...' : (battleResult === 'win' || battleResult === 'training_end' ? 'Retornar ao Dojo' : 'Ir para o Hospital')}</span>
            </GameAction>
          </div>
        )}
      </div>
    </div>
  );
}
