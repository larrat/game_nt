import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const jsx = readFileSync(new URL('../src/pages/Selecionar.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/character-selection.css', import.meta.url), 'utf8');

test('selection uses simultaneously visible owner-scoped character cards and a slot CTA', () => {
  assert.ok(jsx.includes(".eq('user_id', session.user.id)"));
  assert.ok(jsx.includes('characters.map((saved, index) => ('));
  assert.ok(jsx.includes('aria-pressed={currentIndex === index}'));
  assert.ok(jsx.includes('onClick={() => setCurrentIndex(index)}'));
  assert.ok(jsx.includes('characters.length < 3'));
  assert.ok(jsx.includes("onClick={() => navigate('/criar')}"));
  assert.ok(jsx.includes('3 - characters.length'));
  assert.ok(!jsx.includes('onClick={nextChar}'));
  assert.ok(!jsx.includes('onClick={prevChar}'));
});

test('destructive character action is a native modal with exact-name confirmation', () => {
  assert.ok(!jsx.includes('window.prompt('));
  assert.ok(jsx.includes('dialogRef.current.showModal()'));
  assert.ok(jsx.includes('onCancel={event =>'));
  assert.ok(jsx.includes('autoFocus value={deleteConfirmation}'));
  assert.ok(jsx.includes('deleteConfirmation !== pendingDelete.name'));
  assert.ok(jsx.includes('if (confirmation !== char.name)'));
  assert.ok(jsx.includes("rpc('excluir_personagem'"));
  assert.ok(jsx.includes('p_confirmation: confirmation'));
  assert.ok(jsx.includes('deletingRef.current = true'));
  assert.ok(jsx.includes('deletingRef.current = false'));
  assert.ok(!jsx.includes(".from('players').delete()"));
});

test('selection cards and confirmation dialog have mobile, focus, and reduced motion styles', () => {
  for (const selector of [
    '.kuro-character-select__slots',
    '.kuro-character-select__slot.is-current',
    '.kuro-character-select__slot:focus-visible',
    '.kuro-character-select__delete-dialog',
    '.kuro-character-select__delete-dialog::backdrop',
    '.kuro-character-select__delete-dialog input:focus-visible'
  ]) assert.ok(css.includes(selector), selector);
  assert.ok(css.includes('@media (max-width: 520px)'));
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
});
