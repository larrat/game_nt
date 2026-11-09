import test from 'node:test';
import assert from 'node:assert/strict';
import { getDojoPreparation } from '../src/utils/dojoPreparation.js';

const base = { level: 5, energia: 10, ninjutsu: 10, genjutsu: 10, taijutsu: 10, bukijutsu: 10, rank: 'Genin' };
const fullPlayer = () => {
  const resources = getDojoPreparation(base).resources;
  return { ...base, ...Object.fromEntries(resources.map(r => [r.key, r.max])) };
};

test('full resources and loaded arsenal are reported without mutating the player', () => {
  const player = { ...fullPlayer(), activeJutsus: [{ id: 'one' }, { id: 'two' }] };
  const before = JSON.stringify(player);
  const state = getDojoPreparation(player);
  assert.equal(state.state, 'full');
  assert.equal(state.techniqueCount, 2);
  assert.equal(JSON.stringify(player), before);
});

test('partial recovery reports exactly the missing amount', () => {
  const player = fullPlayer();
  player.chakra -= 7;
  const state = getDojoPreparation(player);
  assert.equal(state.state, 'recover');
  assert.equal(state.resources.find(r => r.key === 'chakra').missing, 7);
});

test('zero resources remain zero rather than falling back to maximum', () => {
  const state = getDojoPreparation({ ...fullPlayer(), hp: 0 });
  assert.equal(state.state, 'depleted');
  assert.equal(state.resources[0].current, 0);
});

test('missing and invalid resources do not claim full recovery', () => {
  for (const hp of [undefined, null, '', NaN, Infinity, 'invalid']) {
    const state = getDojoPreparation({ ...fullPlayer(), hp });
    assert.equal(state.state, 'unknown');
    assert.equal(state.resources[0].current, null);
  }
});

test('out of range resources are bounded and numeric strings are accepted', () => {
  const player = fullPlayer();
  const state = getDojoPreparation({ ...player, hp: player.hp + 10, chakra: String(player.chakra), stamina: -5 });
  assert.equal(state.resources[0].missing, 0);
  assert.equal(state.resources[1].missing, 0);
  assert.equal(state.resources[2].current, 0);
});
