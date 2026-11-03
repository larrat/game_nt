import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTING_CLASS_PROFILES } from '../src/utils/startingClassProfiles.js';
import {
  seededRandom, diagnosticDuel, makeClassSnapshot, simulateClassBalance
} from '../src/utils/combatBalanceSimulation.js';

test('all four classes have finite derived stats from the real UI engine', () => {
  for (const profile of STARTING_CLASS_PROFILES) {
    const snapshot = makeClassSnapshot(profile, 1);
    assert.equal(snapshot.classId, profile.id);
    for (const [key, value] of Object.entries(snapshot)) {
      if (key === 'classId') continue;
      assert.ok(Number.isFinite(value), key + ' is not finite');
      if (key !== 'criticalPercent' && key !== 'dodgePercent') assert.ok(value >= 0);
    }
  }
});

test('offline duel has a stable seed and never returns impossible outcomes', () => {
  const ninja = makeClassSnapshot(STARTING_CLASS_PROFILES[0]);
  const taijutsu = makeClassSnapshot(STARTING_CLASS_PROFILES[1]);
  assert.equal(seededRandom(42)(), seededRandom(42)());
  const first = diagnosticDuel(ninja, taijutsu, 987);
  assert.deepEqual(first, diagnosticDuel(ninja, taijutsu, 987));
  assert.ok([0,1,null].includes(first.winner));
  assert.ok(first.rounds >= 1 && first.rounds <= 80);
});

test('full 4x4 matchup report is deterministic, bounded and labelled non-authoritative', () => {
  const settings = { samples: 25, level: 1, seed: 101 };
  const report = simulateClassBalance(settings);
  assert.equal(report.model, 'OFFLINE_APPROXIMATION_NOT_SERVER_COMBAT');
  assert.equal(report.snapshots.length, 4);
  assert.equal(report.matchups.length, 16);
  assert.deepEqual(report, simulateClassBalance(settings));
  for (const row of report.matchups) {
    assert.ok(row.winRate >= 0 && row.winRate <= 1);
    assert.ok(row.drawRate >= 0 && row.drawRate <= 1);
    assert.ok(row.averageRounds > 0 && row.averageRounds <= 80);
  }
});

test('simulator refuses invalid budgets, excessive samples and fake levels', () => {
  assert.throws(() => makeClassSnapshot({
    id: 'TEST', stats: Object.fromEntries(Object.keys(STARTING_CLASS_PROFILES[0].stats).map(x => [x, 0]))
  }), /budget/);
  assert.throws(() => makeClassSnapshot(STARTING_CLASS_PROFILES[0], 0), /Level/);
  assert.throws(() => simulateClassBalance({ samples: 5001 }), /samples/);
});
