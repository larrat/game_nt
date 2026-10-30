import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const path = new URL('../src/utils/characterPresentation.ts', import.meta.url);
const original = readFileSync(path, 'utf8');
// Tests run on Node.js 22 without requiring a full-project TS migration.
const stripped = stripTypeScriptTypes(original, { mode: 'strip' });
const { getCharacterResources, formatCharacterRyous, getCharacterLevel } =
  await import('data:text/javascript;base64,' + Buffer.from(stripped).toString('base64'));

test('exibe recursos reais do personagem, incluindo zero, sem confundir com máximo', () => {
  assert.deepEqual(
    getCharacterResources({ id: 1, name: 'Teste', hp: 0, chakra: 20, stamina: null },
      { hp: 150, chakra: 100, stamina: 80 }),
    [
      { key: 'hp', label: 'Vida', current: 0, max: 150, percent: 0 },
      { key: 'chakra', label: 'Chakra', current: 20, max: 100, percent: 20 },
      { key: 'stamina', label: 'Stamina', current: 80, max: 80, percent: 100 }
    ]
  );
});

test('barra visual nunca ultrapassa máximo ou fica negativa', () => {
  const result = getCharacterResources(
    { id: 1, name: 'Teste', hp: 9999, chakra: -10, stamina: Number.NaN },
    { hp: 110, chakra: 0, stamina: -50 }
  );
  assert.deepEqual(result.map(r => [r.current, r.max, r.percent]),
    [[110, 110, 100], [0, 1, 0], [0, 1, 0]]);
});

test('nível e moeda têm valores válidos para o painel', () => {
  assert.equal(getCharacterLevel(null), 1);
  assert.equal(getCharacterLevel(12), 12);
  assert.equal(formatCharacterRyous(14250), '14.250');
  assert.equal(formatCharacterRyous(null), '0');
  assert.equal(formatCharacterRyous(-20), '0');
});
