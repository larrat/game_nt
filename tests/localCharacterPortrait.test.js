import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolveLocalCharacterPortrait, VERIFIED_LOCAL_PROFILE_FILES } from '../src/utils/localCharacterPortrait.js';

const fixture = JSON.parse(readFileSync(
  new URL('../data/reference/initial-characters.json', import.meta.url), 'utf8'
));

test('only reference-verified initial avatars are served locally', () => {
  assert.deepEqual([...VERIFIED_LOCAL_PROFILE_FILES].sort(),
    ['69-13.png', '110-2.png', '262-3.png'].sort());
  const confirmed = fixture.characters.flatMap(character =>
    (character.variants || []).filter(v => Boolean(v.localArtifactPath))
      .map(v => ({ character: character.name, url: v.url, local: v.localArtifactPath }))
  );
  assert.equal(confirmed.length, VERIFIED_LOCAL_PROFILE_FILES.length);
  for (const record of confirmed) {
    const assetName = record.local.split('/').at(-1);
    assert.ok(VERIFIED_LOCAL_PROFILE_FILES.includes(assetName), record.character);
    assert.equal(resolveLocalCharacterPortrait(record.url), '/images/characters/' + assetName);
    const local = new URL('../public/images/characters/' + assetName, import.meta.url);
    assert.ok(existsSync(local), 'public local asset missing for ' + record.character);
    assert.ok(statSync(local).size > 1000, 'empty local asset for ' + record.character);
  }
});

test('unmatched or unsafe source paths cannot be guessed or substituted with another ninja', () => {
  const missing = 'https://narutogame.com.br/assets/images/logado/profile/122/16.png';
  assert.equal(resolveLocalCharacterPortrait(missing), missing);
  assert.equal(resolveLocalCharacterPortrait('https://other.example/profile/69/13.png'),
    'https://other.example/profile/69/13.png');
  assert.equal(resolveLocalCharacterPortrait('/images/avatares/sasuke_01_kunai.png'),
    '/images/avatares/sasuke_01_kunai.png');
  assert.equal(resolveLocalCharacterPortrait('javascript:alert(1)'), 'javascript:alert(1)');
  assert.equal(resolveLocalCharacterPortrait(null), null);
});

test('character preview first tries a verified local copy then retains the external original as fallback', () => {
  const component = readFileSync(new URL('../src/components/CharacterPortrait.jsx', import.meta.url), 'utf8');
  assert.ok(component.includes("import { resolveLocalCharacterPortrait }"));
  assert.ok(component.includes('localSource !== src ? [localSource, src] : [src]'));
  assert.ok(component.includes('setFailedIndex(index => index + 1)'));
  assert.ok(component.includes('isSupportedPortraitSource(activeSource)'));
});
