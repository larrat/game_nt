import test from 'node:test';
import assert from 'node:assert/strict';
import { getTrainingBudget, getTrainingRange, formatTrainingReceipt } from '../src/utils/training.js';

test('limita o treino aos pontos disponíveis e ao teto de cinco por operação', () => {
  assert.deepEqual(getTrainingBudget(0, 4), { points: 0, maxPerAction: 0, quantity: 0, remaining: 0 });
  assert.deepEqual(getTrainingBudget(2, 5), { points: 2, maxPerAction: 2, quantity: 2, remaining: 0 });
  assert.deepEqual(getTrainingBudget(7, 5), { points: 7, maxPerAction: 5, quantity: 5, remaining: 2 });
  assert.deepEqual(getTrainingBudget(5, 0), { points: 5, maxPerAction: 5, quantity: 1, remaining: 4 });
  assert.deepEqual(getTrainingBudget(-3, 2), { points: 0, maxPerAction: 0, quantity: 0, remaining: 0 });
  assert.deepEqual(getTrainingBudget('3', 2), { points: 3, maxPerAction: 3, quantity: 2, remaining: 1 });
});

test('a faixa estimada espelha a fórmula vigente no RPC (sem fixar o ganho)', () => {
  const student = { train_min_mult: 0.2, train_max_mult: 0.3, train_bonus: 1 };
  assert.deepEqual(getTrainingRange({ hero_min: 4, hero_max: 6 }, student), { min: 2, max: 2, bonus: 1 });
  assert.deepEqual(getTrainingRange({ hero_min: 6, hero_max: 9 }, student), { min: 2, max: 3, bonus: 1 });
  assert.deepEqual(getTrainingRange(null, null), { min: 2, max: 2, bonus: 1 });
  assert.deepEqual(getTrainingRange({ hero_min: 10, hero_max: 20 }, { train_min_mult: 0.3, train_max_mult: 0.5, train_bonus: 2 }), { min: 5, max: 12, bonus: 2 });
});

test('o recibo é apresentado apenas a partir de dados confirmados no servidor', () => {
  assert.equal(formatTrainingReceipt({ success: true, gained: 8, quantity: 3 }, 'Energia'), '+8 em Energia, com 3 ponto(s) utilizado(s).');
  assert.equal(formatTrainingReceipt({ success: false, gained: 99, quantity: 1 }, 'Força'), null);
  assert.equal(formatTrainingReceipt({ success: true, quantity: 1 }, 'Força'), null);
});
