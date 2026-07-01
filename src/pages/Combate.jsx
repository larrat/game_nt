import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/main.css';

import { 
  calculateLevelFromXP,
  calculateHP,
  calculateChakra,
  calculateAtkTaiBuk,
  calculateDefNinGen,
  getElementalMultiplier,
  getGlobalDebuffs
} from '../utils/engine';
import { rollRarity, generateLootStats } from '../utils/lootEngine';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';
import { playHitSound, playCritSound, playJutsuSound } from '../utils/audioEngine';

// Constante de precisão básica física
const BASE_PHYSICAL_ACCURACY = 80;

export default function Combate({ player, updatePlayer, setPlayerState }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const npcInit = location.state?.npc;
  const isMirror = location.state?.isMirror;
  const isAltAutoBattle = location.state?.isAltAutoBattle || false;

  useEffect(() => {
    if (!npcInit || !player) {
      navigate('/dojo');
    }
  }, [npcInit, player, navigate]);

  // Early return removido daqui para respeitar as regras dos hooks.
  // Clãs
  const clanBonus = player?.clan ? (player.clan_bonus || { name: player.clan, critChance: 0, armorPen: 0, paralyzeChance: 0 }) : { critChance: 0, armorPen: 0, paralyzeChance: 0 };
  if (player?.clan === 'Hyuga') clanBonus.armorPen = 0.2;
  if (player?.clan === 'Uchiha') clanBonus.critChance = 0.15;
  if (player?.clan === 'Nara') clanBonus.paralyzeChance = 0.10;

  // Calculando os status máximos do Jogador
  const maxPlayerHP = calculateHP(player);
  const maxPlayerCP = calculateChakra(player);
  const maxPlayerSt = 100 + ((player?.stamina_pts || 0) * 10);
  
  const playerAtk = calculateAtkTaiBuk(player);
  const playerDef = calculateDefNinGen(player); // Corrigido para calculateDefNinGen
  const playerPrecision = player?.precisao || player?.pre || 0;
  const playerArmorPen = (player?.tai || 0) / 10;

  const npcMaxHP = npcInit?.hp || 1;
  const npcMaxCP = npcInit?.chakra || 1;
  const npcMaxSt = 100;

  // Estados da Batalha
  const [playerHP, setPlayerHP] = useState(maxPlayerHP);
  const [playerCP, setPlayerCP] = useState(maxPlayerCP);
  const [playerSt, setPlayerSt] = useState(maxPlayerSt);
  
  const [npcHP, setNpcHP] = useState(npcInit?.hp || 1);
  const [npcCP, setNpcCP] = useState(npcInit?.chakra || 1);
  const [npcSt, setNpcSt] = useState(npcMaxSt);

  const [playerStatus, setPlayerStatus] = useState([]);
  const [npcStatus, setNpcStatus] = useState([]);
  const [cooldowns, setCooldowns] = useState({});

  const playerStatusRef = useRef(playerStatus);
  const npcStatusRef = useRef(npcStatus);
  const playerHPRef = useRef(playerHP);
  const cooldownsRef = useRef(cooldowns);
  
  // Efeitos Visuais (Lote 5)
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
      setTimeout(() => setPlayerShake(false), 300);
    } else {
      setNpcShake(true);
      setTimeout(() => setNpcShake(false), 300);
    }
  };
  
  useEffect(() => { playerStatusRef.current = playerStatus; }, [playerStatus]);
  useEffect(() => { npcStatusRef.current = npcStatus; }, [npcStatus]);
  useEffect(() => { playerHPRef.current = playerHP; }, [playerHP]);
  useEffect(() => { cooldownsRef.current = cooldowns; }, [cooldowns]);

  const [logs, setLogs] = useState([
    location.state?.isWorldBoss ? `🔥 O céu escurece... ${npcInit?.name} surgiu! Prepare-se!` :
    isMirror ? `⚠️ INVASÃO! Você foi emboscado pelo ninja rival ${npcInit?.name}!` : `Um combate se inicia contra ${npcInit?.name}!`
  ]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(!isAltAutoBattle);
  const [battleResult, setBattleResult] = useState(null); // 'win', 'lose', 'flee', 'world_boss_end'
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [turnCount, setTurnCount] = useState(1);
  const [accumulatedDamage, setAccumulatedDamage] = useState(0);
  const [globalDebuffs, setGlobalDebuffs] = useState(getGlobalDebuffs(null));
  const [autoBattle, setAutoBattle] = useState(false);

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

  const logsContainerRef = useRef(null);

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
    if (isPlayerTurn && !battleResult && !isAltAutoBattle) {
      const timer = setInterval(() => {
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
      return () => clearInterval(timer);
    }
  }, [isPlayerTurn, battleResult, npcHP, isAltAutoBattle]);

  useEffect(() => {
    if (isAltAutoBattle && !battleResult) {
      const timer = setTimeout(() => {
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
      return () => clearTimeout(timer);
    }
  }, [isAltAutoBattle, battleResult]);

  useEffect(() => {
    if (isPlayerTurn && autoBattle && !battleResult && !isAltAutoBattle) {
      const timer = setTimeout(() => {
        const jutsus = player.activeJutsus || [];
        const availableJutsus = jutsus.filter(j => playerCP >= (j.chakraCost || 20));
        
        if (availableJutsus.length > 0 && Math.random() > 0.4) {
          const jutsuToUse = availableJutsus[Math.floor(Math.random() * availableJutsus.length)];
          handleJutsu(jutsuToUse);
        } else {
          handleBasicAttack();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
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

  const handleWin = async () => {
    setLoading(true);
    const baseRyous = npcInit.ryouReward || 0;
    const gainedRyous = Math.floor(baseRyous * globalDebuffs.ryouGainMultiplier);
    const newXp = player.xp + (npcInit.xpReward || 0);
    const newRyous = player.ryous + gainedRyous;
    const newLevel = calculateLevelFromXP(newXp);
    const levelsGained = newLevel > player.level ? newLevel - player.level : 0;
    const newPontos = (player.pontos_atributos || 0) + levelsGained;

    const isDojo = !location.state?.fromMap && !location.state?.isWorldBoss && !location.state?.isGhost && !location.state?.isBetrayal && !npcInit.is_dummy;
    const updates = { xp: newXp, level: newLevel, ryous: newRyous, pontos_atributos: newPontos };
    if (isDojo) updates.wins_dojo = (player.wins_dojo || 0) + 1;

    await supabase
      .from('players')
      .update(updates)
      .eq('id', player.id);

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
    }

    if ((npcInit.is_story_mode || npcInit.is_bingo_book) && !location.state?.isGhost) {
       await supabase.from('player_defeated_npcs').insert({
          player_id: player.id,
          npc_id: npcInit.id
       });
    }

    await updatePlayer(player.user_id);
    if (location.state?.isBetrayal) {
      await supabase.from('players').update({ village_id: 8, clan: null, rank: 'Nukenin' }).eq('id', player.id);
      addToast("Você traiu sua vila e agora faz parte da Akatsuki!", "success");
    } else if (location.state?.isBijuuHunt) {
      addToast("Caçada concluída! Chakra da Bijuu extraído para a Organização!", "success");
    } else if (location.state?.isGhost) {
      addToast(`Você derrotou o fantasma de ${npcInit.name}!`, "success");
    } else {
      addToast(`Vitória! +${npcInit.xpReward} XP, +${npcInit.ryouReward} Ryous.${droppedItemMsg}${vipCoinMsg}`, "success");
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
    await updatePlayer(player.user_id);
  };

  const startPlayerTurn = () => {
    setCooldowns(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (next[k] > 0) next[k] -= 1;
      });
      return next;
    });
    setIsPlayerTurn(true);
    setTimeLeft(30);
  };

  const npcTurn = (currentNpcHP) => {
    if (currentNpcHP <= 0) return;

    setTimeout(() => {
      addLog(`${npcInit.name} está atacando...`);
      setTimeout(() => {
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
           
           const bossBaseDamage = Math.max(1, (npcInit.atk * (1 + (turnCount * 0.2))) - playerDef);
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
             if (j.jutsu_effects && j.jutsu_effects.length > 0) {
                const effectName = j.jutsu_effects[0].status_effects?.name;
                if (playerStatusRef.current.some(s => s.name === effectName)) return false;
             }
             return true;
           });

           const jutsu = validJutsus.length > 0 ? validJutsus[Math.floor(Math.random() * validJutsus.length)] : jutsus[Math.floor(Math.random() * jutsus.length)];
           const cost = jutsu.chakraCost || 20;
           
           if (npcCP >= cost) {
              const newNpcCP = npcCP - cost;
              setNpcCP(newNpcCP);
              
              if (newNpcCP <= npcMaxCP * 0.1) {
                addLog(`⚠️ ${npcInit.name} esgotou seu Chakra ao tentar usar [${jutsu.name}] e desmaiou!`);
                setBattleResult('win');
                handleWin();
                return;
              }

              const mult = getElementalMultiplier(jutsu.element || npcInit.element, player.element);
              const jutsuBaseDmg = jutsu.damage || 15;
              const magicDmg = Math.floor((npcInit.nin || npcInit.atk || 0) / 2) + jutsuBaseDmg;
              const finalDamage = Math.max(1, magicDmg - Math.floor(playerDef / 2));
              damage = Math.floor(finalDamage * mult);
              
              if (mult > 1.0) elementalMsg = ' (Vantagem Elemental!)';
              if (mult < 1.0) elementalMsg = ' (Desvantagem Elemental)';

              addLog(`⚠️ ${npcInit.name} usou [${jutsu.name}]! Causou ${damage} de dano!${elementalMsg}`);
              applyJutsuEffects(jutsu, false);
              usedJutsu = true;
           }
        }

        if (!usedJutsu) {
           const mult = getElementalMultiplier(npcInit.element, player.element);
           const baseDamage = Math.max(1, npcInit.atk - playerDef);
           damage = Math.floor(baseDamage * mult);
           
           if (mult > 1.0) elementalMsg = ' (Dano Efetivo!)';
           if (mult < 1.0) elementalMsg = ' (Dano Reduzido)';

           addLog(`${npcInit.name} atacou e causou ${damage} de dano!${elementalMsg}`);
        }

        const newPlayerHP = Math.max(0, playerHPRef.current - damage);
        setPlayerHP(newPlayerHP);
        if (usedJutsu) {
          playJutsuSound();
          spawnFct('player', `-${damage} MAG`, 'magic');
        } else {
          playHitSound();
          spawnFct('player', `-${damage}`, 'damage');
        }
        triggerShake('player');

        if (newPlayerHP <= 0) {
          addLog('Você foi derrotado e caiu inconsciente...');
          setBattleResult('lose');
          setPlayerFainted();
        } else {
          startPlayerTurn();
        }
      }, 1000);
    }, 1000);
  };

  const handleBasicAttack = () => {
    if (!isPlayerTurn || battleResult) return;
    
    const staminaCost = Math.floor(15 * globalDebuffs.staminaCostMultiplier);
    if (playerSt < staminaCost) { addToast(`Stamina insuficiente (${staminaCost}) para atacar!`, 'error'); return; }

    setIsPlayerTurn(false);
    
    const newSt = playerSt - staminaCost;
    setPlayerSt(newSt);

    if (newSt <= maxPlayerSt * 0.1) {
      addLog('Você esgotou sua Stamina (chegou em 10% ou menos) e desmaiou...');
      setBattleResult('lose');
      setPlayerFainted();
      return;
    }

    const totalAccuracy = BASE_PHYSICAL_ACCURACY + (playerArmorPen / 2) - globalDebuffs.accuracyPenalty;
    const didHit = Math.random() * 100 <= totalAccuracy;

    if (!didHit) {
      addLog(`Você usou Ataque Básico mas o inimigo esquivou!`);
      npcTurn(npcHP);
      return;
    }

    const isCrit = clanBonus.critChance > 0 && Math.random() < clanBonus.critChance;
    const defReduction = clanBonus.armorPen > 0 ? Math.floor(npcInit.def * clanBonus.armorPen) : 0;
    
    let damage = Math.max(1, playerAtk - Math.floor(npcInit.def / 2) + defReduction);
    if (isCrit) damage = Math.floor(damage * 1.75);

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

  const handleJutsu = (jutsu) => {
    if (!isPlayerTurn || battleResult) return;
    
    const cost = jutsu.chakraCost || 20; 
    if (playerCP < cost) { addToast('Chakra insuficiente para usar este jutsu!', 'error'); return; }

    setIsPlayerTurn(false);
    const newCP = playerCP - cost;
    setPlayerCP(newCP);
    
    if (newCP <= maxPlayerCP * 0.1) {
      addLog(`Você esgotou seu Chakra ao tentar usar [${jutsu.name}] e desmaiou de exaustão...`);
      setBattleResult('lose');
      setPlayerFainted();
      return;
    }

    const newDailyChakra = (player.daily_chakra_spent || 0) + cost;
    supabase.from('players').update({ daily_chakra_spent: newDailyChakra }).eq('id', player.id);
    
    const jutsuAccuracy = jutsu.accuracy || 100;
    const totalAccuracy = jutsuAccuracy + (playerPrecision / 2) - globalDebuffs.accuracyPenalty;
    const didHit = Math.random() * 100 <= totalAccuracy;

    if (!didHit) {
      addLog(`Você usou [${jutsu.name}] mas o ataque errou o alvo! (Custou ${cost} CP)`);
      npcTurn(npcHP);
      return;
    }

    const mult = getElementalMultiplier(player.element, npcInit.element);
    const jutsuBaseDmg = jutsu.damage || 15;
    
    let attrValue = 0;
    const cat = (jutsu.category || '').toLowerCase();
    if (cat === 'ninjutsu') attrValue = player.ninjutsu || player.nin || 0;
    else if (cat === 'taijutsu') attrValue = player.taijutsu || player.tai || 0;
    else if (cat === 'genjutsu') attrValue = player.genjutsu || player.gen || 0;
    else if (cat === 'bukijutsu') attrValue = player.bukijutsu || player.buk || 0;
    else attrValue = player.ninjutsu || player.nin || 0; // fallback

    const magicDmg = Math.floor(attrValue / 2) + jutsuBaseDmg;
    const finalDamage = Math.max(1, magicDmg - Math.floor(npcInit.def / 2));
    const damage = Math.floor(finalDamage * mult);

    const newNpcHP = Math.max(0, npcHP - damage);
    setNpcHP(newNpcHP);

    playJutsuSound();
    triggerShake('npc');
    spawnFct('npc', `-${damage} MAG`, mult > 1 ? 'crit' : 'magic');

    let elementalMsg = '';
    if (mult > 1.0) elementalMsg = ' (Vantagem Elemental! Dano Crítico!)';
    if (mult < 1.0) elementalMsg = ' (Desvantagem Elemental. Dano Reduzido)';

    addLog(`Você usou [${jutsu.name}] e causou ${damage} de dano elemental!${elementalMsg} (Custou ${cost} CP)`);
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
    if (!window.confirm("Bandeira Branca: Você deseja desistir? Você ficará inconsciente e perderá seu progresso nesta batalha.")) return;
    
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

  return (
    <div className="page">
      <PageHeader eyebrow='A Fúria dos Shinobis' title='Combate' />

      {isPlayerTurn && !battleResult && (
        <div style={{ marginBottom: '24px' }}>
          <div className="flex-between" style={{ fontSize: '12px', marginBottom: '8px' }}>
            <span className="mono gold">SEU TURNO</span>
            <span className={`mono ${timeLeft <= 10 ? 'danger' : 'muted'}`}>{timeLeft}s Restantes</span>
          </div>
          <div className="progress-track" style={{ height: '4px', background: 'rgba(0,0,0,0.5)' }}>
            <div className={`progress-fill ${timeLeft <= 10 ? 'red' : 'gold'}`} style={{ width: `${(timeLeft / 30) * 100}%`, transition: 'width 1s linear' }}></div>
          </div>
        </div>
      )}

      <div className="flex-col" style={{ width: '100%', gap: '24px' }}>
        
        <div className="flex-row" style={{ alignItems: 'stretch', gap: '24px' }}>
          
          <div className={`card flex-col ${playerShake ? 'shake' : ''}`} style={{ flex: 1, borderColor: clanBonus.name ? 'rgba(212,162,42,0.3)' : 'var(--line)', position: 'relative' }}>
            {fcts.filter(f => f.target === 'player').map(f => (
              <div key={f.id} className={`fct fct-${f.type}`}>{f.text}</div>
            ))}
            <div className="flex-row">
              <div className="flex-row" style={{ width: '64px', height: '64px', background: 'var(--ink-raised)', justifyContent: 'center', fontSize: '32px', border: '1px solid var(--line)', borderRadius: '6px', overflow: 'hidden' }}>
                {player.avatar?.startsWith('/') ? <img src={player.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '忍'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="paper" style={{ fontSize: '18px', marginBottom: '4px' }}>{player.name}</h3>
                <div className="mono muted" style={{ fontSize: '12px' }}>Lvl. {player.level}</div>
              </div>
            </div>
            
            <div className="flex-col" style={{ marginTop: 'auto' }}>
              <div>
                <div className="flex-between paper" style={{ fontSize: '12px', marginBottom: '8px' }}>
                  <span className="flex-row" style={{ gap: '6px', fontWeight: 600 }}><div className="dot-indicator red"></div> HP</span>
                  <span className="mono" style={{ opacity: 0.8 }}>{playerHP}/{maxPlayerHP}</span>
                </div>
                <div className="progress-track" style={{ height: '8px' }}>
                  <div className="progress-fill red" style={{ width: `${pHPPercent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex-between paper" style={{ fontSize: '12px', marginBottom: '8px' }}>
                  <span className="flex-row" style={{ gap: '6px', fontWeight: 600 }}><div className="dot-indicator blue"></div> Chakra</span>
                  <span className="mono" style={{ opacity: 0.8 }}>{playerCP}/{maxPlayerCP}</span>
                </div>
                <div className="progress-track" style={{ height: '8px' }}>
                  <div className="progress-fill blue" style={{ width: `${pCPPercent}%` }}></div>
                </div>
              </div>

              <div className="flex-row" style={{ gap: '8px', minHeight: '24px', marginTop: '8px' }}>
                {playerStatus.map((s, i) => (
                  <div key={i} className="badge badge-muted flex-row" style={{ gap: '4px', padding: '2px 6px', fontSize: '10px' }}>
                    <span>{s.icon}</span> <span>{s.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-row" style={{ justifyContent: 'center', padding: '0 16px' }}>
            <div className="page-title gold" style={{ fontSize: '24px' }}>VS</div>
          </div>

          <div className={`card flex-col ${npcShake ? 'shake' : ''}`} style={{ flex: 1, border: isMirror ? '1px solid #ef4444' : '1px solid var(--line)', position: 'relative' }}>
            {fcts.filter(f => f.target === 'npc').map(f => (
              <div key={f.id} className={`fct fct-${f.type}`}>{f.text}</div>
            ))}
            <div className="flex-row" style={{ flexDirection: 'row-reverse', textAlign: 'right' }}>
              <div className="flex-row" style={{ width: '64px', height: '64px', background: 'var(--ink-raised)', justifyContent: 'center', fontSize: '32px', border: isMirror ? '1px solid #ef4444' : '1px solid var(--seal-bright)', borderRadius: '6px' }}>
                {npcInit.avatar}
              </div>
              <div>
                <h3 className="danger" style={{ fontSize: '18px', marginBottom: '4px' }}>
                  {isMirror && '⚠️ '}{npcInit.name}
                </h3>
                <div className="mono muted" style={{ fontSize: '12px' }}>Lvl. {npcInit.level}</div>
              </div>
            </div>
            
            <div className="flex-col" style={{ marginTop: 'auto' }}>
              <div>
                <div className="flex-between paper" style={{ fontSize: '12px', marginBottom: '8px', flexDirection: 'row-reverse' }}>
                  <span className="flex-row" style={{ gap: '6px', fontWeight: 600, flexDirection: 'row-reverse' }}><div className="dot-indicator red"></div> HP</span>
                  <span className="mono" style={{ opacity: 0.8 }}>{npcHP}/{npcMaxHP}</span>
                </div>
                <div className="progress-track" style={{ height: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <div className="progress-fill red" style={{ width: `${nHPPercent}%`, background: 'linear-gradient(270deg, #d32f2f, #ff4b4b)' }}></div>
                </div>
              </div>

              <div>
                <div className="flex-between paper" style={{ fontSize: '12px', marginBottom: '8px', flexDirection: 'row-reverse' }}>
                  <span className="flex-row" style={{ gap: '6px', fontWeight: 600, flexDirection: 'row-reverse' }}><div className="dot-indicator blue"></div> Chakra</span>
                  <span className="mono" style={{ opacity: 0.8 }}>{npcCP}/{npcMaxCP}</span>
                </div>
                <div className="progress-track" style={{ height: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <div className="progress-fill blue" style={{ width: `${nCPPercent}%`, background: 'linear-gradient(270deg, #1976d2, #4b9eff)' }}></div>
                </div>
              </div>
              
              <div className="flex-row" style={{ gap: '8px', minHeight: '24px', marginTop: '8px', flexDirection: 'row-reverse' }}>
                {npcStatus.map((s, i) => (
                  <div key={i} className="badge badge-muted flex-row" style={{ gap: '4px', padding: '2px 6px', fontSize: '10px' }}>
                    <span>{s.duration}</span> <span>{s.icon}</span> 
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        <div className="card mono" ref={logsContainerRef} style={{ background: '#121216', height: '250px', overflowY: 'auto', padding: '16px', fontSize: '13px', lineHeight: '1.6' }}>
          {logs.map((log, idx) => (
            <div key={idx} style={{ marginBottom: '8px', color: log.includes('derrotado') || log.includes('causou') ? (log.includes('Você usou') ? '#4ade80' : '#ef4444') : 'var(--muted)' }}>
              &gt; {log}
            </div>
          ))}
        </div>

        {!battleResult ? (
          isAltAutoBattle ? (
            <div className="card flex-col" style={{ textAlign: 'center', border: '1px dashed var(--gold)', background: 'var(--ink)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🤖</div>
              <h3 className="gold" style={{ marginBottom: '8px' }}>Modo Auto-Battle</h3>
              <p className="muted" style={{ fontSize: '12px' }}>O Wintrading Shield foi ativado. Você não pode interferir no combate contra seu próprio alter ego. O sistema resolverá a batalha com base nos atributos e na sorte de ambos.</p>
            </div>
          ) : (
          <div className="flex-wrap" style={{ gap: '16px' }}>
            <button 
              className="btn-ghost" 
              style={{ flex: 1, minWidth: '150px', padding: '16px', border: '1px solid var(--line)', opacity: isPlayerTurn ? 1 : 0.5 }} 
              disabled={!isPlayerTurn}
              onClick={handleBasicAttack}
            >
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>👊</div>
              Ataque Básico
              <div className="muted mono" style={{ fontSize: '10px', marginTop: '4px' }}>Precisão: {BASE_PHYSICAL_ACCURACY}%</div>
            </button>
            
            {player.activeJutsus?.map((jutsu, idx) => {
               const jutsuBaseAcc = jutsu.accuracy || 100;
               const finalAcc = Math.min(100, jutsuBaseAcc + Math.floor(playerPrecision / 2));
               
               let attrValue = 0;
               const cat = (jutsu.category || '').toLowerCase();
               if (cat === 'ninjutsu') attrValue = player.ninjutsu || player.nin || 0;
               else if (cat === 'taijutsu') attrValue = player.taijutsu || player.tai || 0;
               else if (cat === 'genjutsu') attrValue = player.genjutsu || player.gen || 0;
               else if (cat === 'bukijutsu') attrValue = player.bukijutsu || player.buk || 0;
               else attrValue = player.ninjutsu || player.nin || 0;
               
               const jutsuBaseDmg = jutsu.damage || 15;
               const magicDmg = Math.floor(attrValue / 2) + jutsuBaseDmg;
               const estDamage = Math.max(1, magicDmg - Math.floor(npcInit.def / 2));
               const cost = jutsu.chakraCost || 20;

               return (
                <button 
                  key={idx}
                  className="btn-ghost flex-col" 
                  style={{ flex: 1, minWidth: '150px', padding: '12px', border: '1px solid var(--seal-bright)', opacity: isPlayerTurn ? 1 : 0.5, gap: '4px', alignItems: 'center' }} 
                  disabled={!isPlayerTurn}
                  onClick={() => handleJutsu(jutsu)}
                >
                  <div className="flex-row" style={{ alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                    <span style={{ fontSize: '16px' }}>📜</span> {jutsu.name}
                  </div>
                  <div className="flex-row" style={{ gap: '12px', marginTop: '4px' }}>
                    <span className="mono blue" style={{ fontSize: '10px' }}>-{cost} CP</span>
                    <span className="mono red" style={{ fontSize: '10px' }}>~{estDamage} DMG</span>
                    <span className="mono gold" style={{ fontSize: '10px' }}>{finalAcc}% ACC</span>
                  </div>
                </button>
               );
            })}

            <button 
              className="btn-ghost flex-row" 
              style={{ width: '100%', padding: '16px', border: '1px dashed #ef4444', color: '#ef4444', opacity: isPlayerTurn ? 1 : 0.5, marginTop: '8px', justifyContent: 'center', gap: '8px' }} 
              disabled={!isPlayerTurn}
              onClick={handleSurrender}
            >
              <span style={{ fontSize: '20px' }}>🏳️</span> Desistir da Luta
            </button>

            <button 
              className={`btn-ghost flex-row ${autoBattle ? 'active' : ''}`}
              style={{ width: '100%', padding: '16px', border: autoBattle ? '1px solid var(--gold)' : '1px solid var(--line)', color: autoBattle ? 'var(--gold)' : 'var(--muted)', opacity: isPlayerTurn ? 1 : 0.5, marginTop: '8px', justifyContent: 'center', gap: '8px' }}
              onClick={() => setAutoBattle(!autoBattle)}
            >
              <span style={{ fontSize: '20px' }}>🤖</span> Auto-Battle: {autoBattle ? 'LIGADO' : 'DESLIGADO'}
            </button>
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

            <button className="btn-primary" onClick={battleResult === 'world_boss_end' ? handleWorldBossEnd : () => navigate(battleResult === 'win' ? (location.state?.fromMap ? '/mapa' : '/dojo') : '/hospital')} disabled={loading}>
              <span>{loading ? 'Retornando...' : (battleResult === 'win' ? 'Retornar' : 'Ir para o Hospital')}</span>
              <div className="stamp"></div>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
