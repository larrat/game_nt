/**
 * OFFLINE DIAGNOSTIC ONLY. Uses the existing UI stat formulas to compare class
 * profiles with a deterministic proxy duel model. It is NOT the SQL combat RPC,
 * cannot predict official rewards, and must never authorize XP/ryous/loot.
 */
import { STARTING_CLASS_PROFILES, getStartingAttributeTotal, STARTING_ATTRIBUTE_BUDGET } from './startingClassProfiles.js';
import {
  calculateHP, calculateChakra, calculateAtkTaiBuk, calculateAtkNinGen,
  calculateDefTaiBuk, calculateDefNinGen, calculateCritChance, calculateDodgeChance
} from './engine.js';

export function seededRandom(seed = 1) {
  let state = (Math.trunc(seed) >>> 0) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export function makeClassSnapshot(profile, level = 1) {
  if (!profile || getStartingAttributeTotal(profile.stats) !== STARTING_ATTRIBUTE_BUDGET) {
    throw new Error('Invalid class budget. Expected 10 allocated points.');
  }
  if (!Number.isInteger(level) || level < 1 || level > 200) {
    throw new Error('Level must be an integer from 1 to 200');
  }
  const character = { ...profile.stats, level, rank: 'Estudante da Academia', clan: null };
  return {
    classId: profile.id, level,
    hp: calculateHP(character), chakra: calculateChakra(character),
    physicalAttack: calculateAtkTaiBuk(character),
    magicalAttack: calculateAtkNinGen(character),
    physicalDefense: calculateDefTaiBuk(character),
    magicalDefense: calculateDefNinGen(character),
    criticalPercent: calculateCritChance(character),
    dodgePercent: calculateDodgeChance(character)
  };
}

export function diagnosticDuel(left, right, seed = 1, maxRounds = 80) {
  const rng = seededRandom(seed);
  const hp = [left.hp, right.hp];
  const combatants = [left, right];
  let turns = 0;
  const attackerFirst = rng() < 0.5 ? 0 : 1;
  for (let round = 1; round <= maxRounds; round++) {
    for (let step = 0; step < 2; step++) {
      const i = (attackerFirst + step) % 2, j = 1-i;
      const a = combatants[i], d = combatants[j];
      const physical = a.physicalAttack >= a.magicalAttack;
      const offense = physical ? a.physicalAttack : a.magicalAttack;
      const defense = physical ? d.physicalDefense : d.magicalDefense;
      const dodged = rng() < d.dodgePercent / 100;
      const critical = rng() < a.criticalPercent / 100;
      const variance = 0.85 + rng() * 0.30;
      const damage = dodged ? 0 : Math.max(1,
        Math.floor(Math.max(1,offense-defense*0.4)*variance*(critical ? 1.5 : 1)));
      hp[j] -= damage;
      turns++;
      if (hp[j] <= 0) return { winner: i, turns, rounds: round };
    }
  }
  return { winner: null, turns, rounds: maxRounds };
}

export function simulateClassBalance({ samples = 200, level = 1, seed = 20261103 } = {}) {
  if (!Number.isInteger(samples) || samples < 1 || samples > 5000) {
    throw new Error('samples must be an integer from 1 to 5000');
  }
  const profiles = STARTING_CLASS_PROFILES;
  const snapshots = profiles.map(p => makeClassSnapshot(p, level));
  const results = [];
  for (let i = 0; i < snapshots.length; i++) {
    for (let j = 0; j < snapshots.length; j++) {
      let victories = 0, draws = 0, totalRounds = 0;
      for (let k = 0; k < samples; k++) {
        const match = diagnosticDuel(snapshots[i], snapshots[j],
          (seed + i*1000003 + j*10007 + k*31) >>> 0);
        if (match.winner === 0) victories++;
        if (match.winner === null) draws++;
        totalRounds += match.rounds;
      }
      results.push({
        attackerClass: snapshots[i].classId, defenderClass: snapshots[j].classId,
        samples, winRate: Number((victories/samples).toFixed(3)),
        drawRate: Number((draws/samples).toFixed(3)),
        averageRounds: Number((totalRounds/samples).toFixed(2))
      });
    }
  }
  const warnings = results.filter(r => r.attackerClass !== r.defenderClass &&
    (r.winRate < 0.2 || r.winRate > 0.8)).map(r =>
    r.attackerClass + ' vs ' + r.defenderClass + ': ' + Math.round(r.winRate*100) + '%');
  return {
    model: 'OFFLINE_APPROXIMATION_NOT_SERVER_COMBAT', level, samples, seed,
    snapshots, matchups: results, warnings
  };
}
