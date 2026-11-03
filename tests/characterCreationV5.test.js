import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STARTING_ATTRIBUTE_BUDGET, STARTING_ATTRIBUTES, STARTING_CLASS_PROFILES,
  getStartingAttributeTotal, getStartingClassProfile
} from '../src/utils/startingClassProfiles.js';
import {
  CHARACTER_CATALOG_PAGE_SIZE, filterCharacterCatalog,
  paginateCharacterCatalog, isStartingAvatar, chooseStartingAvatar
} from '../src/utils/characterCatalog.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('accent-insensitive search does not lose any catalog entries', () => {
  const characters = [
    { id: 'a', name: 'Naruto Uzumaki' },
    { id: 'b', name: 'Técnica Especial' },
    { id: 'c', name: 'Sasuke Uchiha' }
  ];
  assert.equal(filterCharacterCatalog(characters, '').length, 3);
  assert.deepEqual(filterCharacterCatalog(characters, 'TECNICA').map(x => x.id), ['b']);
  assert.deepEqual(filterCharacterCatalog(characters, 'sasuke').map(x => x.id), ['c']);
  assert.deepEqual(filterCharacterCatalog(characters, 'desconhecido'), []);
});

test('paged catalog limits rendered portraits and clamps invalid pages', () => {
  const chars = Array.from({ length: 188 }, (_, i) => ({ id: String(i), name: 'Ninja ' + i }));
  const page0 = paginateCharacterCatalog(chars, 0);
  const page10 = paginateCharacterCatalog(chars, 10);
  const pageOutOfRange = paginateCharacterCatalog(chars, 900);
  assert.equal(CHARACTER_CATALOG_PAGE_SIZE, 18);
  assert.equal(page0.items.length, 18);
  assert.equal(page10.items.length, 8);
  assert.equal(pageOutOfRange.page, 10);
  assert.equal(pageOutOfRange.totalPages, 11);
});

test('starting avatar selection is owned by the character and base-only', () => {
  const avatars = [
    { id: '/images/sasuke-1.png', character_id: '2', is_base: true },
    { id: '/images/sasuke-evolved.png', character_id: '2', is_base: false },
    { id: 'https://example.org/naruto.png', character_id: '1', is_base: true }
  ];
  assert.equal(isStartingAvatar(avatars, '2', '/images/sasuke-1.png'), true);
  assert.equal(isStartingAvatar(avatars, '2', '/images/sasuke-evolved.png'), false);
  assert.equal(isStartingAvatar(avatars, '1', '/images/sasuke-1.png'), false);
  assert.equal(chooseStartingAvatar(avatars, { id: '2', base_avatar_url: '/images/sasuke-evolved.png' }), '/images/sasuke-1.png');
  assert.equal(chooseStartingAvatar(avatars, { id: '1', base_avatar_url: 'https://example.org/naruto.png' }), 'https://example.org/naruto.png');
});

test('three-step creator and selected character screen use remote-aware portrait rendering', () => {
  const create = read('src/pages/Criar.jsx');
  const select = read('src/pages/Selecionar.jsx');
  const portrait = read('src/components/CharacterPortrait.jsx');
  const style = read('src/styles/character-creation-v5.css');
  assert.ok(create.includes('setCurrentStep('));
  assert.ok(create.includes('paginateCharacterCatalog(filteredCharacters, catalogPage)'));
  assert.ok(create.includes('isStartingAvatar(avatars, selectedCharacter, selectedAvatar)'));
  assert.ok(create.includes('avatar.is_base === true'));
  assert.ok(create.includes('CharacterPortrait'));
  assert.ok(select.includes('<CharacterPortrait'));
  assert.ok(portrait.includes('onError={() => setFailedIndex(index => index + 1)}'));
  assert.ok(portrait.includes('https:'));
  assert.ok(style.includes('@media(max-width:760px)'));
  assert.ok(style.includes('prefers-reduced-motion'));
});

test('future migration rejects evolved or mismatched avatars and preserves auth guard', () => {
  const migration = read('migrations/073_secure_character_starting_avatars.sql');
  assert.ok(migration.includes('a.character_id = p_character_id'));
  assert.ok(migration.includes('a.is_base IS TRUE'));
  assert.ok(migration.includes('RAISE EXCEPTION'));
  assert.ok(migration.includes('auth.uid() IS NULL'));
  assert.ok(migration.includes('GRANT EXECUTE ON FUNCTION public.criar_personagem'));
  assert.ok(!migration.includes('ORDER BY a.is_base DESC NULLS LAST'));
});

test('every class starts with the same ten allocated points across the same ten stats', () => {
  assert.equal(STARTING_ATTRIBUTE_BUDGET, 10);
  assert.equal(STARTING_ATTRIBUTES.length, 10);
  assert.equal(STARTING_CLASS_PROFILES.length, 4);
  const allowed = STARTING_ATTRIBUTES.map(attribute => attribute.key).sort();
  for (const profile of STARTING_CLASS_PROFILES) {
    assert.deepEqual(Object.keys(profile.stats).sort(), allowed, profile.id + ' stat keys');
    assert.equal(getStartingAttributeTotal(profile.stats), STARTING_ATTRIBUTE_BUDGET, profile.id + ' budget mismatch');
    assert.ok(Object.values(profile.stats).every(value => Number.isInteger(value) && value >= 0));
    assert.equal(getStartingClassProfile(profile.id).id, profile.id);
  }
  assert.notDeepEqual(STARTING_CLASS_PROFILES[0].stats, STARTING_CLASS_PROFILES[1].stats,
    'specializations should distribute ten points differently');
});

test('server migration and UI use identical ten-point starting distributions', () => {
  const migration = read('migrations/073_secure_character_starting_avatars.sql');
  const creator = read('src/pages/Criar.jsx');
  assert.match(migration, /1, 0, 1000, 0,/); // 0 unspent points: no 5 bonus points above the ten.
  assert.ok(migration.includes('v_starting_total <> 10'));
  assert.ok(migration.includes('pg_catalog.jsonb_each_text(v_stats)'));
  assert.ok(creator.includes('STARTING_ATTRIBUTES.map(attribute =>'));
  assert.ok(creator.includes('getStartingAttributeTotal(currentClass.stats)'));
  assert.ok(creator.includes('max={STARTING_ATTRIBUTE_BUDGET}'));
  assert.ok(!creator.includes('Object.entries(currentClass.stats).filter'));
  const sqlFields = [
    'forca', 'agilidade', 'resistencia', 'inteligencia', 'energia',
    'ninjutsu', 'taijutsu', 'genjutsu', 'bukijutsu', 'selo'
  ];
  for (const field of sqlFields) {
    assert.ok(migration.includes("(v_stats->>'" + field + "')::integer"),
      'migration must insert ' + field);
  }
  for (const profile of STARTING_CLASS_PROFILES) {
    const expression = new RegExp("WHEN '" + profile.id + "' THEN '(\\{[^']+\\})'::jsonb");
    const match = migration.match(expression);
    assert.ok(match, 'missing SQL stats for class ' + profile.id);
    assert.deepEqual(JSON.parse(match[1]), profile.stats,
      'SQL and UI differ for class ' + profile.id);
  }
});
