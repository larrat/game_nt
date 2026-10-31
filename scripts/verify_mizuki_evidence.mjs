import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = new URL('../docs/reverse-engineering/coleta-2026-10-31/historia-mizuki-combate.json', import.meta.url);
const records = JSON.parse(await readFile(source, 'utf8'));
assert.equal(records.length, 26, 'Esperados 25 estados anteriores às ações e o resultado final');
const states = records.map(({ text }) => ({
  turn: Number(text.match(/Turno (\d+)/)?.[1]),
  chakra: Number(text.match(/Chakra:\s*(\d+)/)?.[1]),
  stamina: Number(text.match(/Stamina:\s*(\d+)/)?.[1]),
  enemyHp: Number([...text.matchAll(/Vida:\s*(\d+)/g)][1]?.[1]),
}));
for (let i = 1; i < states.length; i++) {
  const before = states[i - 1];
  const after = states[i];
  assert.equal(before.turn, i, `Turno inesperado na ação ${i}`);
  assert.equal(before.chakra - after.chakra, i % 2 ? 3 : 5, `Custo de chakra da ação ${i}`);
  assert.equal(before.stamina - after.stamina, i % 2 ? 18 : 12, `Custo de stamina da ação ${i}`);
}
assert.equal(states.at(-1).enemyHp, 0, 'O estado final precisa comprovar HP zero do adversário');
console.log('25 transições verificadas: 99 chakra e 378 stamina; adversário com HP zero.');
