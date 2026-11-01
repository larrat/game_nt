import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CLAN_IMAGE_FILES, getClanArtworkUrl, getAttributeArtworkUrl } from '../src/utils/clanArtwork.js';

test('forty collected clan illustrations exist in the public application', () => {
  assert.equal(Object.keys(CLAN_IMAGE_FILES).length, 40);
  for (const file of Object.values(CLAN_IMAGE_FILES)) {
    assert.match(file, /^[a-z0-9-]+\.png$/);
    assert.ok(existsSync('public/images/clans/' + file), 'Missing clan image ' + file);
  }
});

test('clan names and variants resolve to local images without using remote URLs', () => {
  assert.equal(getClanArtworkUrl({ name: 'Clã Uchiha', image_url: 'https://example.com/no.jpg' }), '/images/clans/uchiha.png');
  assert.equal(getClanArtworkUrl({ name: 'Clá Uzumaki' }), '/images/clans/uzumaki.png');
  assert.equal(getClanArtworkUrl({ name: 'Hyuga' }), '/images/clans/hyuuga.png');
  assert.equal(getClanArtworkUrl({ name: 'Kibaku Nendo' }), '/images/clans/kibaku-nendo.png');
  assert.equal(getClanArtworkUrl({ name: 'Unknown', image_url: 'https://example.com/image.png' }), null);
  assert.equal(getClanArtworkUrl({ name: 'Unknown', image_url: '/images/../secrets.png' }), null);
});

test('ten attribute images are mapped and the Clan screen no longer displays emoji attributes', () => {
  for (const field of ['agilidade', 'selo', 'forca', 'inteligencia', 'resistencia', 'ninjutsu', 'genjutsu', 'taijutsu', 'energia', 'bukijutsu']) {
    const src = getAttributeArtworkUrl(field);
    assert.ok(existsSync('public' + src), field);
  }
  assert.equal(getAttributeArtworkUrl('../../oops'), null);
  const screen = readFileSync('src/pages/Clas.jsx', 'utf8');
  assert.ok(screen.includes('<ClanArtwork'));
  assert.ok(screen.includes('getAttributeArtworkUrl(attr)'));
  assert.ok(!screen.includes('ATTR_ICONS'));
});
