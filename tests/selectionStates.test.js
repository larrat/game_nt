import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const select=readFileSync(new URL('../src/pages/Selecionar.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/character-selection.css',import.meta.url),'utf8');

test('character navigation uses Motion without overriding reduced-motion preference',()=>{
  assert.ok(select.includes("from 'motion/react'"));
  assert.ok(select.includes('<AnimatePresence mode="wait">'));
  assert.ok(select.includes('<motion.div'));
  assert.ok(select.includes('useReducedMotion()'));
  assert.ok(select.includes('initial={reduceMotion ? false'));
  assert.ok(css.includes('.selection-showcase { animation:none; }'));
});
test('network error cannot be mistaken for no characters and can be retried',()=>{
  assert.ok(select.includes('setLoadError('));
  assert.ok(select.includes('role="alert"'));
  assert.ok(select.includes('setRetryVersion(v => v + 1)'));
  assert.ok(select.includes('characters.length === 0 ? ('));
  assert.ok(select.indexOf('{loadError ? (') < select.indexOf('characters.length === 0 ? ('));
});
test('player switching prevents duplicate clicks; removal uses an owner-only RPC',()=>{
  assert.ok(select.includes('if (joining !== null) return'));
  assert.ok(select.includes('disabled={joining !== null || loading}'));
  assert.ok(select.includes("rpc('excluir_personagem'"));
  assert.ok(select.includes('p_confirmation: confirmation'));
  assert.ok(!select.includes("from('players').delete()"));
  assert.ok(select.includes('setJoining(null)'));
  assert.ok(select.includes('onClick={() => handleSelect(char)}'));
});
test('character selection preserves progress values and original identity layout',()=>{
  for(const str of ['getCharacterResources(char','formatCharacterRyous(char.ryous)','getCharacterLevel(char.level)','<progress','VILLAGES[char.village_id]']) assert.ok(select.includes(str),str);
  assert.match(css, /@media \(max-width: 520px\)/);
});
