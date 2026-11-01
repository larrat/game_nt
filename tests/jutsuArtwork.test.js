import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CONFIRMED_CLAN_ART, getJutsuArtworkUrl } from '../src/utils/jutsuArtwork.js';

test('only confirmed same-clan existing techniques receive artwork', () => {
  assert.equal(getJutsuArtworkUrl({ name: 'Amaterasu', req_clan: 'Uchiha' }), '/images/jutsu-art/amaterasu.jpg');
  assert.equal(getJutsuArtworkUrl({ name: 'Kage Nui (Costura das Sombras)', req_clan: 'Nara' }), '/images/jutsu-art/kage-nui.jpg');
  assert.equal(getJutsuArtworkUrl({ name: 'Oito Trigramas: 64 Golpes', req_clan: 'Hyūga' }), '/images/jutsu-art/hakke-64.jpg');
  assert.equal(getJutsuArtworkUrl({ name: 'Oito Trigramas: Leões Gêmeos', req_clan: 'Hyūga' }), '/images/jutsu-art/juuho-soushiken.jpg');
  assert.equal(getJutsuArtworkUrl({ name: 'Amaterasu', req_clan: 'Senju' }), null);
  assert.equal(getJutsuArtworkUrl({ name: 'Mokuton: Outra Técnica', req_clan: 'Senju' }), null);
});

test('all linked jutsu art exists and untrusted URLs are not hotlinked', () => {
  for (const path of Object.values(CONFIRMED_CLAN_ART)) {
    assert.ok(existsSync('public' + path), 'Missing art ' + path);
  }
  assert.equal(getJutsuArtworkUrl({ name: 'Outra', icon_url: 'https://narutogame.com.br/icon.jpg' }), null);
  assert.equal(getJutsuArtworkUrl({ name: 'Outra', icon_url: '/images/jutsu-art/../private.png' }), null);
});

test('jutsu card uses accessible image or vector fallback, never scroll emoji', () => {
  const card = readFileSync('src/components/JutsuCard.jsx', 'utf8');
  const artwork = readFileSync('src/components/JutsuArtwork.jsx', 'utf8');
  assert.ok(card.includes('<JutsuArtwork'));
  assert.ok(!card.includes('📜'));
  assert.ok(artwork.includes('<SidebarIcon name="scroll"'));
  assert.ok(artwork.includes('onError='));
});
