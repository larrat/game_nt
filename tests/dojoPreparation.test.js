import test from 'node:test';
import assert from 'node:assert/strict';
import { getDojoPreparation } from '../src/utils/dojoPreparation.js';
import { calculateHP, calculateChakra, calculateStamina } from '../src/utils/engine.js';

const base = { level: 5, energia: 10, ninjutsu: 10, genjutsu: 10, taijutsu: 10, bukijutsu: 10, rank: 'Genin' };
const full = {
  ...base,
  hp: calculateHP(base),
  chakra: calculateChakra(base),
  stamina: calculateStamina(base)
};

test('reports full projected resources and a loaded arsenal without mutating the player', () => {
  const player = Object.freeze({ ...full, activeJutsus: [{ id: 'one' }, { id: 'two' }] });
  const preparation = getDojoPreparation(player);
  assert.equal(preparation.state, 'full');
  assert.equal(preparation.techniqueCount, 2);
  assert.deepEqual(preparation.resources.map(({ max, current }) => [max, current]),
    [[full.hp, full.hp], [full.chakra, full.chakra], [full.stamina, full.stamina]]);
});

test('reports the shortfall and bounds values to the current projection', () => {
  const result = getDojoPreparation({ ...full, hp: full.hp + 15, chakra: String(full.chakra - 7) });
  assert.equal(result.state, 'recover');
  assert.equal(result.resources[0].missing, 0);
  assert.equal(result.resources[1].missing, 7);
});

test('keeps zero and flags depletion even if another resource is unknown', () => {
  const result = getDojoPreparation({ ...full, hp: 0, stamina: undefined });
  assert.equal(result.state, 'depleted');
  assert.equal(result.resources[0].current, 0);
  assert.equal(result.resources[2].missing, null);
});

test('does not turn missing, blank or invalid values into zero or full recovery', () => {
  for (const stamina of [undefined, null, '', ' ', NaN, Infinity, 'invalid', true, []]) {
    const result = getDojoPreparation({ ...full, stamina });
    assert.equal(result.state, 'unknown');
    assert.equal(result.resources[2].current, null);
  }
});

test('distinguishes an empty arsenal from one that is not loaded', () => {
  assert.equal(getDojoPreparation(full).techniqueCount, null);
  assert.equal(getDojoPreparation({ ...full, activeJutsus: [] }).techniqueCount, 0);
  assert.equal(getDojoPreparation().state, 'unknown');
});
