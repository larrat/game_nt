import {
  calculateCritChance,
  calculateDodgeChance,
  calculateChakraDiscount,
  getElementalMultiplier,
  getJutsuEnhancementBonus
} from './engine.js';

export const BASE_PHYSICAL_ACCURACY = 80;

const PORTOES_TABLE = [
  { id: 1, boost: 0.05 }, { id: 2, boost: 0.10 }, { id: 3, boost: 0.20 },
  { id: 4, boost: 0.35 }, { id: 5, boost: 0.50 }, { id: 6, boost: 0.70 },
  { id: 7, boost: 1.00 }, { id: 8, boost: 2.00 }
];
const PORTOES_COOLDOWN_MS = 30 * 60 * 1000;

export function getCombatJutsus(player) {
  return player?.activeJutsus || [];
}

export function getClanBonus(player) {
  const base = player?.clan
    ? { ...(player.clan_bonus || { name: player.clan, critChance: 0, armorPen: 0, paralyzeChance: 0 }) }
    : { critChance: 0, armorPen: 0, paralyzeChance: 0 };

  if (player?.clan === 'Hyuga') return { ...base, armorPen: 0.2 };
  if (player?.clan === 'Uchiha') return { ...base, critChance: 0.15 };
  if (player?.clan === 'Nara') return { ...base, paralyzeChance: 0.10 };
  return base;
}

export function getPortaoBoost(player, nowMs = Date.now()) {
  if (!player?.portoes_used_at || !player?.portao_nivel) return 1.0;
  const usedAt = new Date(player.portoes_used_at).getTime();
  if (nowMs - usedAt > PORTOES_COOLDOWN_MS) return 1.0;
  const portao = PORTOES_TABLE.find(p => p.id === player.portao_nivel);
  return portao ? 1 + portao.boost : 1.0;
}

export function getJutsuCombatStats(jutsu, player, npcDef, cooldowns = {}) {
  const jutsuBaseAcc = jutsu.accuracy || 100;
  const playerPrecision = player?.precisao || player?.pre || 0;
  const finalAcc = Math.min(100, jutsuBaseAcc + Math.floor(playerPrecision / 2));

  const cat = (jutsu.category || '').toLowerCase();
  let attrValue = 0;
  if (cat === 'ninjutsu') attrValue = player?.ninjutsu || player?.nin || 0;
  else if (cat === 'taijutsu') attrValue = player?.taijutsu || player?.tai || 0;
  else if (cat === 'genjutsu') attrValue = player?.genjutsu || player?.gen || 0;
  else if (cat === 'bukijutsu') attrValue = player?.bukijutsu || player?.buk || 0;
  else attrValue = player?.ninjutsu || player?.nin || 0;

  const bonusDano = getJutsuEnhancementBonus(jutsu, 'dano');
  const bonusCusto = getJutsuEnhancementBonus(jutsu, 'custo');
  const bonusLetalidade = getJutsuEnhancementBonus(jutsu, 'letalidade');

  const jutsuBaseDmg = (jutsu.damage || 15) + bonusDano;
  const magicDmg = Math.floor(attrValue / 2) + jutsuBaseDmg;
  const estDamage = Math.max(1, magicDmg - Math.floor((npcDef || 0) / 2));

  const seloDiscount = Math.min(0.5, (player?.selos || 0) * 0.01);
  const originalCost = jutsu.chakraCost || 20;
  const baseCost = originalCost + bonusCusto;
  const cost = Math.floor(Math.max(originalCost * 0.1, Math.max(1, baseCost * (1 - seloDiscount))));

  const hasEssences = bonusDano > 0 || bonusCusto < 0 || bonusLetalidade > 0;
  const jutsuLevel = jutsu.level || 1;
  const jutsuCdVal = cooldowns[jutsu.id] || 0;

  return { finalAcc, cost, estDamage, hasEssences, jutsuLevel, jutsuCdVal, isOnCooldown: jutsuCdVal > 0 };
}

export function getCombatBgStyle(bgType, villageId) {
  if (bgType === 'dojo') {
    return {
      backgroundImage: 'linear-gradient(rgba(10,10,15,0.75), rgba(10,10,15,0.92)), url(/images/bg_dojo.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center top'
    };
  }
  if (bgType === 'map') {
    return {
      backgroundImage: 'linear-gradient(rgba(10,10,15,0.75), rgba(10,10,15,0.92)), url(/images/bg_forest.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center top'
    };
  }
  if (villageId) {
    return {
      backgroundImage: `linear-gradient(rgba(10,10,15,0.75), rgba(10,10,15,0.92)), url(/images/bg_${villageId}.jpg)`,
      backgroundSize: 'cover',
      backgroundPosition: 'center top'
    };
  }
  return {};
}

export function getCombatHeaderMeta({ isWorldBossCombat, isExame, isMirror, isStoryMode }) {
  const eyebrow = isWorldBossCombat
    ? 'Incursão mundial'
    : isExame
      ? 'Exame de graduação'
      : isMirror
        ? 'Duelo ninja'
        : isStoryMode
          ? 'Modo história'
          : 'A Fúria dos Shinobis';
  const title = isWorldBossCombat
    ? 'Chefe Mundial'
    : isExame
      ? 'Prova de graduação'
      : isMirror
        ? 'Duelo de espelho'
        : 'Combate';
  const subtitle = isWorldBossCombat
    ? 'Una estratégia e resistência para enfrentar a ameaça global.'
    : isExame
      ? 'Mostre domínio das técnicas e avance na sua graduação.'
      : isMirror
        ? 'Enfrente uma versão rival e prove a força da sua build.'
        : isStoryMode
          ? 'Avance na história e descubra o próximo capítulo da sua jornada.'
          : 'Leia o adversário, escolha suas técnicas e controle o ritmo da batalha.';
  return { eyebrow, title, subtitle };
}

export function decrementCooldownMap(prev) {
  const next = { ...prev };
  Object.keys(next).forEach(k => {
    if (next[k] > 0) next[k] -= 1;
  });
  return next;
}

export function stepActiveBuffs(prev) {
  if (prev.duration > 0) {
    if (prev.duration - 1 === 0) {
      return { next: { protecao: 0, letalidade: 0, duration: 0 }, expired: true };
    }
    return { next: { ...prev, duration: prev.duration - 1 }, expired: false };
  }
  return { next: prev, expired: false };
}

export function formatVictoryRewardSummary(resultData) {
  const gainedRyous = resultData?.ryous_gained || 0;
  const gainedXp = resultData?.xp_gained || 0;
  const levelsGained = resultData?.levels_gained || 0;
  let droppedItemMsg = '';
  const vipCoinMsg = resultData?.vip_coin_dropped ? ' 🪙 +1 Kuro Coin!' : '';
  if (resultData?.loot_item_name) {
    droppedItemMsg = ` Você encontrou [${resultData.loot_item_name}] (${resultData.loot_rarity || 'Comum'})!`;
  }
  if (resultData?.essence_key) {
    const [essenceType, essenceTier] = String(resultData.essence_key).split('_');
    droppedItemMsg += ` 📜 +1 Essência [${String(essenceType).toUpperCase()} Tier ${essenceTier}]!`;
  }
  return {
    mainToast: `Vitória! +${gainedXp} XP, +${gainedRyous} Ryous.${droppedItemMsg}${vipCoinMsg}`,
    levelToast: levelsGained > 0 ? `🎉 Você subiu ${levelsGained} Níveis!` : null
  };
}

export function resolveWorldBossNpcAttack({ npcAtkTaiBuk, turnCount, playerDef, npcElement, playerElement, playerHP, npcName }) {
  if (turnCount >= 10) {
    return {
      obliterated: true,
      damage: playerHP,
      nextPlayerHP: 0,
      logs: [
        `🚨 AVISO CRÍTICO: ${npcName} está acumulando um chakra absurdo...`,
        '💥 BIJUU DAMA! O mundo inteiro tremeu. Você foi obliterado.'
      ]
    };
  }
  const bossBaseDamage = Math.max(1, (npcAtkTaiBuk * (1 + (turnCount * 0.2))) - playerDef);
  const mult = getElementalMultiplier(npcElement, playerElement);
  const damage = Math.floor(bossBaseDamage * mult);
  const nextPlayerHP = Math.max(0, playerHP - damage);
  const logs = [`${npcName} causou ${damage} de dano! (Turno ${turnCount}/10)`];
  if (nextPlayerHP <= 0) {
    logs.push('Você não suportou a pressão do chakra e caiu...');
  }
  return { obliterated: false, damage, nextPlayerHP, logs };
}

export function resolveLocalBasicAttack({
  player,
  npcHP,
  npcDef,
  playerSt,
  playerAtkTaiBuk,
  playerArmorPen,
  portaoAtkMultiplier,
  globalDebuffs,
  clanBonus,
  activeBuffs,
  equippedSummon
}) {
  const staminaCost = Math.floor(15 * (globalDebuffs?.staminaCostMultiplier || 1));
  if (playerSt < staminaCost) {
    return { errorToast: `Stamina insuficiente (${staminaCost}) para atacar!` };
  }

  const nextStamina = playerSt - staminaCost;
  const totalAccuracy = Math.min(100, BASE_PHYSICAL_ACCURACY + (playerArmorPen / 2) - (globalDebuffs?.accuracyPenalty || 0));
  const didHit = Math.random() * 100 <= totalAccuracy;

  if (!didHit) {
    return {
      hit: false,
      nextStamina,
      nextNpcHP: npcHP,
      damage: 0,
      logs: ['Você usou Ataque Básico mas o inimigo esquivou!']
    };
  }

  const baseCrit = calculateCritChance(player);
  const clanCrit = clanBonus.critChance > 0 ? clanBonus.critChance * 100 : 0;
  const totalCritChance = baseCrit + clanCrit + (activeBuffs?.letalidade || 0);
  const isCrit = Math.random() * 100 <= totalCritChance;
  const defReduction = clanBonus.armorPen > 0 ? Math.floor(npcDef * clanBonus.armorPen) : 0;

  let summonDamageBonus = 0;
  if (equippedSummon?.name?.includes('Gamakichi')) {
    summonDamageBonus += Math.floor((equippedSummon.base_atk || 0) * 0.1);
  }

  const critMult = isCrit ? 1.75 : 1.0;
  const combinedMult = Math.min(2.5, portaoAtkMultiplier * critMult);
  const damage = Math.max(1, Math.floor(playerAtkTaiBuk * combinedMult) - Math.floor(npcDef / 2) + defReduction + summonDamageBonus);
  const nextNpcHP = Math.max(0, npcHP - damage);

  const logs = [];
  if (portaoAtkMultiplier > 1.0) logs.push('⚡ Os Portões do Chakra impulsionam seu ataque!');

  let msg = `Você usou Ataque Básico e causou ${damage} de dano!`;
  if (isCrit) msg += ' 👁️ CRÍTICO!';
  if (clanBonus.armorPen > 0) msg += ' [Byakugan: ignorou def]';
  if (summonDamageBonus > 0) msg += ` [Bônus de ${equippedSummon.name}]`;
  logs.push(msg);

  const paralyzed = clanBonus.paralyzeChance > 0 && Math.random() < clanBonus.paralyzeChance;
  if (paralyzed) {
    logs.push('🌑 Sombra Nara: inimigo paralisado! Turno extra ganho.');
  }

  return {
    hit: true,
    isCrit,
    damage,
    nextStamina,
    nextNpcHP,
    paralyzed,
    logs
  };
}

export function resolveLocalJutsuAttack({
  jutsu,
  player,
  npcInit,
  npcHP,
  npcDef,
  playerCP,
  playerPrecision,
  globalDebuffs,
  activeBuffs,
  equippedSummon,
  cooldowns
}) {
  const jutsuCooldown = jutsu.cooldown || 0;
  const currentCooldown = cooldowns[jutsu.id] || 0;
  if (currentCooldown > 0) {
    return {
      errorToast: `[${jutsu.name}] em recarga! (${currentCooldown} turno${currentCooldown > 1 ? 's' : ''} restante${currentCooldown > 1 ? 's' : ''})`
    };
  }

  const bonusCusto = getJutsuEnhancementBonus(jutsu, 'custo');
  const bonusDano = getJutsuEnhancementBonus(jutsu, 'dano');
  const bonusLetalidade = getJutsuEnhancementBonus(jutsu, 'letalidade');
  const bonusProtecao = getJutsuEnhancementBonus(jutsu, 'protecao');

  const seloDiscount = calculateChakraDiscount(player) * 0.01;
  const originalCost = jutsu.chakraCost || 20;
  const baseCost = originalCost + bonusCusto;
  const cost = Math.floor(Math.max(originalCost * 0.1, Math.max(1, baseCost * (1 - seloDiscount))));
  if (playerCP < cost) {
    return { errorToast: 'Chakra insuficiente para usar este jutsu!' };
  }

  const nextCP = playerCP - cost;
  const nextCooldownValue = jutsuCooldown > 0 ? jutsuCooldown + 1 : 0;

  if (nextCP <= 0) {
    return {
      exhaustedChakra: true,
      nextCP,
      nextCooldownValue,
      logs: [`Você ficou sem Chakra usando [${jutsu.name}] e desmaiou de exaustão...`]
    };
  }

  const jutsuAccuracy = jutsu.accuracy || 100;
  const totalAccuracy = Math.min(100, jutsuAccuracy + (playerPrecision / 2) - (globalDebuffs?.accuracyPenalty || 0));
  const didHit = Math.random() * 100 <= totalAccuracy;

  if (!didHit) {
    return {
      hit: false,
      nextCP,
      nextNpcHP: npcHP,
      nextCooldownValue,
      logs: [`Você usou [${jutsu.name}] mas o ataque errou o alvo! (Custou ${cost} CP)`]
    };
  }

  const mult = getElementalMultiplier(jutsu.element || player.element, npcInit.element);
  const jutsuBaseDmg = (jutsu.damage || 15) + bonusDano;

  let summonDamageBonus = 0;
  if (equippedSummon?.name?.includes('Gamakichi') && jutsu.element === 'Katon') {
    summonDamageBonus += Math.floor(jutsuBaseDmg * 0.2);
  }

  const cat = (jutsu.category || '').toLowerCase();
  let attrValue = 0;
  if (cat === 'ninjutsu') attrValue = player.ninjutsu || player.nin || 0;
  else if (cat === 'taijutsu') attrValue = player.taijutsu || player.tai || 0;
  else if (cat === 'genjutsu') attrValue = player.genjutsu || player.gen || 0;
  else if (cat === 'bukijutsu') attrValue = player.bukijutsu || player.buk || 0;
  else attrValue = player.ninjutsu || player.nin || 0;

  const magicDmg = Math.floor(attrValue / 2) + jutsuBaseDmg;
  const rawDamage = Math.max(1, magicDmg - Math.floor(npcDef / 2) + summonDamageBonus);

  const baseCrit = calculateCritChance(player);
  const totalCritChance = baseCrit + bonusLetalidade + (activeBuffs?.letalidade || 0);
  const isCrit = Math.random() * 100 <= totalCritChance;
  const critMult = isCrit ? 1.5 : 1.0;

  const damage = Math.floor(rawDamage * mult * critMult);
  const nextNpcHP = Math.max(0, npcHP - damage);

  const logs = [];
  let nextBuffs = null;
  if (bonusProtecao > 0 || bonusLetalidade > 0) {
    nextBuffs = { protecao: bonusProtecao, letalidade: bonusLetalidade, duration: 2 };
    logs.push('✨ O Jutsu ativou um Buff Temporário (2 turnos)!');
  }

  let extraMsg = '';
  if (isCrit) extraMsg += ' ⚡ CRÍTICO!';
  if (mult > 1.0) extraMsg += ' (Vantagem Elemental!)';
  if (mult < 1.0) extraMsg += ' (Desvantagem Elemental)';
  if (bonusDano > 0) extraMsg += ` [+${bonusDano} Essência]`;

  logs.push(`Você usou [${jutsu.name}] e causou ${damage} de dano!${extraMsg} (Custou ${cost} CP)`);

  return {
    hit: true,
    isCrit,
    mult,
    damage,
    cost,
    nextCP,
    nextNpcHP,
    nextCooldownValue,
    nextBuffs,
    logs
  };
}

export function resolveLocalNpcTurnStep({
  currentNpcHP,
  npcInit,
  npcCP,
  npcSt,
  npcAtkTaiBuk,
  npcAtkNinGen,
  player,
  playerDef,
  playerHP,
  activeBuffs,
  npcStatusList,
  playerStatusList,
  npcCooldowns
}) {
  const logs = [];
  let nHP = currentNpcHP;
  let isStunned = false;
  let isSilenced = false;
  const nextNpcStatus = [];

  (npcStatusList || []).forEach(status => {
    if (status.type === 'dot') {
      nHP = Math.max(0, nHP - status.base_value);
      logs.push(`🩸 [${status.name}] causou ${status.base_value} de dano continuo ao inimigo.`);
    } else if (status.type === 'hot') {
      nHP += status.base_value;
      logs.push(`💚 [${status.name}] curou ${status.base_value} de vida do inimigo.`);
    } else if (status.type === 'stun') {
      isStunned = true;
      logs.push(`💫 Inimigo incapaz de agir devido a [${status.name}].`);
    } else if (status.type === 'silence') {
      isSilenced = true;
    }

    if (status.duration > 1) {
      nextNpcStatus.push({ ...status, duration: status.duration - 1 });
    } else {
      logs.push(`⏳ O efeito [${status.name}] expirou no inimigo.`);
    }
  });

  if (nHP <= 0) {
    logs.push(`${npcInit.name} sucumbiu aos efeitos e caiu!`);
    return { npcDefeatedByDot: true, nextNpcHP: nHP, nextNpcStatus, logs };
  }

  if (isStunned) {
    return { stunned: true, nextNpcHP: nHP, nextNpcStatus, logs };
  }

  const jutsus = npcInit.activeJutsus || [];
  let usedJutsu = false;
  let chosenJutsu = null;
  let damage = 0;
  let nextNpcCP = npcCP;
  let nextNpcSt = npcSt;
  let nextNpcCooldowns = npcCooldowns;

  if (!isSilenced && jutsus.length > 0 && Math.random() > 0.5) {
    const validJutsus = jutsus.filter(j => {
      if ((npcCooldowns[j.id] || 0) > 0) return false;
      if (j.jutsu_effects && j.jutsu_effects.length > 0) {
        const effectName = j.jutsu_effects[0].status_effects?.name;
        if ((playerStatusList || []).some(s => s.name === effectName)) return false;
      }
      return true;
    });

    const jutsu = validJutsus.length > 0 ? validJutsus[Math.floor(Math.random() * validJutsus.length)] : null;
    if (jutsu) {
      const cost = jutsu.chakraCost || 20;
      if (npcCP >= cost) {
        nextNpcCP = npcCP - cost;
        if ((jutsu.cooldown || 0) > 0) {
          nextNpcCooldowns = { ...npcCooldowns, [jutsu.id]: (jutsu.cooldown || 0) + 1 };
        }
        const mult = getElementalMultiplier(jutsu.element || npcInit.element, player.element);
        const jutsuBaseDmg = jutsu.damage || 15;
        const cat = (jutsu.category || '').toLowerCase();
        const npcMagic = (cat === 'taijutsu' || cat === 'bukijutsu') ? npcAtkTaiBuk : npcAtkNinGen;
        const magicDmg = npcMagic + jutsuBaseDmg;
        const defBonus = activeBuffs?.protecao || 0;
        const finalDamage = Math.max(1, magicDmg - Math.floor((playerDef + defBonus) / 2));
        damage = Math.floor(finalDamage * mult);

        let elementalMsg = '';
        if (mult > 1.0) elementalMsg = ' (Vantagem Elemental!)';
        if (mult < 1.0) elementalMsg = ' (Desvantagem Elemental)';

        logs.push(`⚠️ ${npcInit.name} usou [${jutsu.name}]! Causou ${damage} de dano!${elementalMsg}`);
        usedJutsu = true;
        chosenJutsu = jutsu;
      }
    }
  }

  if (!usedJutsu) {
    const staminaCost = 15;
    if (npcSt < staminaCost) {
      logs.push(`💨 ${npcInit.name} tentou atacar, mas está exausto demais!`);
    } else {
      nextNpcSt = npcSt - staminaCost;
      const dodgeRoll = Math.random() * 100;
      const dodgeChance = calculateDodgeChance(player);
      if (dodgeRoll <= dodgeChance) {
        logs.push(`💨 ${npcInit.name} tentou um ataque básico, mas você esquivou!`);
        damage = 0;
      } else {
        const mult = getElementalMultiplier(npcInit.element, player.element);
        const defBonus = activeBuffs?.protecao || 0;
        const baseDamage = Math.max(1, npcAtkTaiBuk - (playerDef + defBonus));
        damage = Math.floor(baseDamage * mult);

        let elementalMsg = '';
        if (mult > 1.0) elementalMsg = ' (Dano Efetivo!)';
        if (mult < 1.0) elementalMsg = ' (Dano Reduzido)';

        logs.push(`${npcInit.name} atacou e causou ${damage} de dano!${elementalMsg}`);
      }
    }
  }

  if (damage > 0 && activeBuffs?.protecao > 0) {
    logs.push('🛡️ Seu Escudo absorveu parte do impacto!');
  }

  const nextPlayerHP = Math.max(0, playerHP - damage);
  if (nextPlayerHP <= 0) {
    logs.push('Você foi derrotado e caiu inconsciente...');
  }

  return {
    npcDefeatedByDot: false,
    stunned: false,
    usedJutsu,
    chosenJutsu,
    damage,
    nextNpcHP: nHP,
    nextNpcCP,
    nextNpcSt,
    nextNpcStatus,
    nextNpcCooldowns,
    nextPlayerHP,
    logs
  };
}
