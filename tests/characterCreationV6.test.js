import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterCharacterCatalog, paginateCharacterCatalog } from '../src/utils/characterCatalog.js';
import { chooseStartingAvatar, isStartingAvatar } from '../src/utils/characterCatalog.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const creator = read('src/pages/Criar.jsx');
const css = read('src/styles/character-creation-v5.css');
const snapshot = JSON.parse(read('data/audits/character-asset-snapshot-2026-11-03.json'));

test('the character creator never treats evolved looks as free starting appearances', () => {
  assert.ok(creator.includes(".eq('is_base', true)"));
  assert.ok(creator.includes('avatar.is_base === true'));
  assert.ok(creator.includes('isStartingAvatar(avatars, selectedCharacter, selectedAvatar)'));
  assert.ok(creator.includes("rpc('criar_personagem'"));
  assert.ok(creator.includes('p_avatar: selectedAvatar'));
  const sasuke = snapshot.characters.find(c => c.id === '2');
  const sasukeAvatars = snapshot.avatars.filter(a => a.character_id === sasuke.id);
  assert.equal(sasukeAvatars.filter(a => a.is_base).length, 17);
  assert.equal(sasukeAvatars.filter(a => !a.is_base).length, 11);
  assert.equal(chooseStartingAvatar(sasukeAvatars, sasuke), sasuke.base_avatar_url);
  assert.equal(isStartingAvatar(sasukeAvatars, '2', '/images/avatares/sasuke_23_susanoo.png'), false);
});

test('catalog selection sorts real players by display name without losing search/pagination contracts', () => {
  assert.ok(creator.includes("a.name.localeCompare(b.name, 'pt-BR')"));
  assert.ok(creator.includes('paginateCharacterCatalog(filteredCharacters, catalogPage)'));
  assert.ok(creator.includes('setCatalogPage(0)'));
  assert.ok(creator.includes('filterCharacterCatalog(characters, searchQuery)'));
  const sample = [ {id:'2',name:'Sasuke'}, {id:'1',name:'Naruto'}, {id:'3',name:'Kakashi'} ];
  const alphabetical = [...sample].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  assert.deepEqual(alphabetical.map(x=>x.id), ['3','1','2']);
  assert.equal(paginateCharacterCatalog(filterCharacterCatalog(alphabetical,'naruto'), 0).items[0].id,'1');
});

test('the starter-appearance filter is based on canonical avatar membership not file-name guessing', () => {
  assert.ok(creator.includes('initialVariantCounts = new Map()'));
  assert.ok(creator.includes("appearanceFilter === 'multiple'"));
  assert.ok(creator.includes('initialVariantCounts.get(character.id)'));
  assert.ok(creator.includes('startingVariants.length > 1 ? ('));
  assert.ok(creator.includes('kuro-create-v6__single-variant'));
  assert.ok(creator.includes('selectedVariant?.name'));
  const counts = new Map();
  for (const a of snapshot.avatars.filter(a=>a.is_base)) counts.set(a.character_id,(counts.get(a.character_id)||0)+1);
  assert.equal(counts.get('2'),17);
  assert.equal(counts.get('4'),1);
  assert.equal(counts.get('ng-initial-122'),1);
});

test('V6 controls remain legible on mobile, use canonical theme and accessible focus', () => {
  for (const token of ['--kuro-bg', '--kuro-surface', '--kuro-gold', '--kuro-copy']) assert.ok(css.includes(token));
  for (const selector of ['kuro-create-v6__catalog-toolbar', 'kuro-create-v6__filter:focus-visible', 'kuro-create-v6__variant-header', 'kuro-create-v6__single-variant']) assert.ok(css.includes(selector), selector);
  assert.ok(css.includes('grid-auto-flow: column'));
  assert.ok(css.includes('overflow-x: auto'));
  assert.ok(css.includes('@media (max-width: 420px)'));
  assert.ok(css.includes('prefers-reduced-motion'));
  assert.ok(creator.includes('aria-pressed={appearanceFilter'));
  assert.ok(creator.includes('aria-labelledby="character-create-visual-label"'));
});
