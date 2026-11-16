import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import {
  hasLocalCharacterPortrait,
  LOCAL_CHARACTER_PORTRAIT_MAP,
  resolveLocalCharacterPortrait,
  VERIFIED_LOCAL_PROFILE_FILES
} from '../src/utils/localCharacterPortrait.js';

const fixture = JSON.parse(readFileSync(
  new URL('../data/reference/initial-characters.json', import.meta.url), 'utf8'
));

test('all verified local profile files exist in public/images/characters and map cleanly', () => {
  assert.equal(VERIFIED_LOCAL_PROFILE_FILES.length, 97);
  assert.equal(Object.keys(LOCAL_CHARACTER_PORTRAIT_MAP).length, 97);
  for (const assetName of VERIFIED_LOCAL_PROFILE_FILES) {
    const local = new URL('../public/images/characters/' + assetName, import.meta.url);
    assert.ok(existsSync(local), 'public local asset missing for ' + assetName);
    assert.ok(statSync(local).size > 1000, 'empty local asset for ' + assetName);
  }
  const confirmed = fixture.characters.flatMap(character =>
    (character.variants || []).filter(v => Boolean(v.localArtifactPath))
      .map(v => ({ character: character.name, url: v.url, local: v.localArtifactPath }))
  );
  for (const record of confirmed) {
    const assetName = record.local.split('/').at(-1);
    assert.ok(VERIFIED_LOCAL_PROFILE_FILES.includes(assetName), record.character);
    assert.equal(resolveLocalCharacterPortrait(record.url), '/images/characters/' + assetName);
    assert.equal(hasLocalCharacterPortrait(record.url), true);
  }
});

test('unmatched or unsafe source paths are rejected and never load external URLs', () => {
  const missing = 'https://narutogame.com.br/assets/images/logado/profile/111/1.png';
  assert.equal(resolveLocalCharacterPortrait(missing), missing);
  assert.equal(hasLocalCharacterPortrait(missing), false);
  assert.equal(resolveLocalCharacterPortrait('https://other.example/profile/69/13.png'),
    'https://other.example/profile/69/13.png');
  assert.equal(hasLocalCharacterPortrait('https://other.example/profile/69/13.png'), false);
  assert.equal(resolveLocalCharacterPortrait('/images/avatares/sasuke_01_kunai.png'),
    '/images/avatares/sasuke_01_kunai.png');
  assert.equal(hasLocalCharacterPortrait('/images/avatares/sasuke_01_kunai.png'), true);
  assert.equal(resolveLocalCharacterPortrait('javascript:alert(1)'), 'javascript:alert(1)');
  assert.equal(hasLocalCharacterPortrait('javascript:alert(1)'), false);
  assert.equal(resolveLocalCharacterPortrait(null), null);
});

test('character portrait renders only local images and never falls back to external URLs', () => {
  const component = readFileSync(new URL('../src/components/CharacterPortrait.jsx', import.meta.url), 'utf8');
  assert.ok(component.includes('resolveLocalCharacterPortrait'));
  assert.ok(component.includes('hasLocalCharacterPortrait(localSource) ? [localSource] : []'));
  assert.ok(!component.includes('[localSource, src]'));
  assert.ok(component.includes('setFailedIndex(index => index + 1)'));
  assert.ok(component.includes('isSupportedPortraitSource(activeSource)'));
});
