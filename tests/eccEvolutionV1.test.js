import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getClanBonus,
  getPortaoBoost,
  getJutsuCombatStats,
  decrementCooldownMap,
  stepActiveBuffs,
  formatVictoryRewardSummary,
  resolveWorldBossNpcAttack,
  resolveLocalBasicAttack
} from '../src/utils/combatResolution.js';

const read = (relPath) => readFileSync(new URL('../' + relPath, import.meta.url), 'utf8');

test('combatResolution pure helpers preserve immutability and calculate expected stats', () => {
  const rawPlayer = Object.freeze({
    clan: 'Uchiha',
    clan_bonus: Object.freeze({ name: 'Uchiha', critChance: 0, armorPen: 0, paralyzeChance: 0 }),
    ninjutsu: 40,
    precisao: 10,
    selos: 20,
    portao_nivel: 3,
    portoes_used_at: '2026-11-16T15:00:00.000Z'
  });

  const clanBonus = getClanBonus(rawPlayer);
  assert.equal(clanBonus.critChance, 0.15);
  assert.equal(rawPlayer.clan_bonus.critChance, 0);

  const activeNow = new Date('2026-11-16T15:10:00.000Z').getTime();
  const expiredNow = new Date('2026-11-16T15:45:00.000Z').getTime();
  assert.equal(getPortaoBoost(rawPlayer, activeNow), 1.2);
  assert.equal(getPortaoBoost(rawPlayer, expiredNow), 1.0);

  const jutsu = { id: 7, name: 'Katon', category: 'Ninjutsu', damage: 30, chakraCost: 40, accuracy: 90 };
  const stats = getJutsuCombatStats(jutsu, rawPlayer, 20, { 7: 2 });
  assert.equal(stats.finalAcc, 95);
  assert.equal(stats.estDamage, 40);
  assert.equal(stats.cost, 32);
  assert.equal(stats.jutsuCdVal, 2);
  assert.equal(stats.isOnCooldown, true);
});

test('cooldowns, buffs, rewards and world boss turn resolution behave deterministically', () => {
  const cds = Object.freeze({ a: 2, b: 1, c: 0 });
  assert.deepEqual(decrementCooldownMap(cds), { a: 1, b: 0, c: 0 });
  assert.equal(cds.a, 2);

  const step1 = stepActiveBuffs({ protecao: 10, letalidade: 5, duration: 2 });
  assert.equal(step1.expired, false);
  assert.equal(step1.next.duration, 1);

  const step2 = stepActiveBuffs(step1.next);
  assert.equal(step2.expired, true);
  assert.equal(step2.next.duration, 0);

  const reward = formatVictoryRewardSummary({
    xp_gained: 120,
    ryous_gained: 300,
    levels_gained: 1,
    vip_coin_dropped: true,
    loot_item_name: 'Kunai',
    loot_rarity: 'Raro',
    essence_key: 'dano_2'
  });
  assert.match(reward.mainToast, /\+120 XP, \+300 Ryous/);
  assert.match(reward.mainToast, /\[Kunai\] \(Raro\)/);
  assert.match(reward.mainToast, /DANO Tier 2/);
  assert.match(reward.mainToast, /Kuro Coin/);
  assert.equal(reward.levelToast, '🎉 Você subiu 1 Níveis!');

  const bossFinisher = resolveWorldBossNpcAttack({
    npcAtkTaiBuk: 100,
    turnCount: 10,
    playerDef: 20,
    npcElement: 'Katon',
    playerElement: 'Futon',
    playerHP: 500,
    npcName: 'Juubi'
  });
  assert.equal(bossFinisher.obliterated, true);
  assert.equal(bossFinisher.nextPlayerHP, 0);

  const lowStaminaAttack = resolveLocalBasicAttack({
    player: {},
    npcHP: 100,
    npcDef: 10,
    playerSt: 5,
    playerAtkTaiBuk: 50,
    playerArmorPen: 0,
    portaoAtkMultiplier: 1,
    globalDebuffs: { staminaCostMultiplier: 1, accuracyPenalty: 0 },
    clanBonus: { critChance: 0, armorPen: 0, paralyzeChance: 0 },
    activeBuffs: {},
    equippedSummon: null
  });
  assert.match(lowStaminaAttack.errorToast, /Stamina insuficiente/);
});

test('Combate.jsx enforces click-path locks, timeout cleanup, and cooldown-aware auto-battle', () => {
  const combat = read('src/pages/Combate.jsx');
  assert.ok(combat.includes('turnActionInFlightRef'));
  assert.ok(combat.includes('scheduleTimeout'));
  assert.ok(combat.includes('!stats.isOnCooldown && playerCP >= stats.cost'));
});

test('Tailwind v4 migration and UI polish remove static inline styles and transition:all', () => {
  const elements = read('src/pages/Elementos.jsx');
  const mapGrid = read('src/components/MapGrid.jsx');
  const gates = read('src/pages/Portoes.jsx');
  const fighter = read('src/components/CombatFighterCard.jsx');
  const map = read('src/pages/Mapa.jsx');

  assert.ok(!elements.includes('style={'), 'Elementos.jsx should have zero inline styles');
  assert.ok(!mapGrid.includes('style={'), 'MapGrid.jsx should have zero inline styles');
  assert.ok(gates.includes('tabular-nums'));
  assert.ok(fighter.includes('tabular-nums'));
  assert.ok(fighter.includes('transition-[opacity,visibility]'));
  assert.ok(!map.includes("transition: 'all"));
});

test('Inventory, Forge, and Summons enforce owner scope, concurrency locks, and parallel queries', () => {
  const equip = read('src/pages/Equipamentos.jsx');
  const summons = read('src/pages/Invocacoes.jsx');
  const smith = read('src/pages/Ferreiro.jsx');

  assert.ok(equip.includes(".eq('id', invItem.id)\n        .eq('player_id', player.id)"));
  assert.ok(equip.includes('actionBusy'));
  assert.ok(!equip.includes('style={'));
  assert.ok(summons.includes('Promise.all(['));
  assert.ok(!summons.includes('console.error'));
  assert.ok(smith.includes('await Promise.all([updatePlayer(player.id), loadInventory()])'));
});
