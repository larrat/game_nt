import test from 'node:test';
import assert from 'node:assert/strict';
import { localArtworkPath, normalizedCharacterName, resolveNpcArtwork, resolveWorldBossArtwork } from '../src/utils/npcArtwork.js';

test('nomes de NPCs com inversão, acentos e espaços usam a arte local correta', () => {
  assert.equal(resolveNpcArtwork({ name: 'Naruto Uzumaki', avatar: '🥷' }), '/images/naruto.jpg');
  assert.equal(resolveNpcArtwork({ name: 'Uzumaki Naruto' }), '/images/naruto.jpg');
  assert.equal(resolveNpcArtwork({ name: 'Sasuke Uchiha' }), '/images/sasuke.jpg');
  assert.equal(resolveNpcArtwork({ name: 'Sakura Haruno' }), '/images/sakura.jpg');
  assert.equal(resolveNpcArtwork({ name: 'Kakashi Hatake' }), '/images/kakashi.jpg');
  assert.equal(normalizedCharacterName('  Técnicas Ágeis '), 'tecnicas ageis');
});

test('retratos explícitos válidos têm prioridade; URLs externas e caminhos inseguros não', () => {
  assert.equal(resolveNpcArtwork({ name: 'Naruto', avatar: '/images/avatares/naruto_custom.png' }), '/images/avatares/naruto_custom.png');
  assert.equal(resolveNpcArtwork({ name: 'Naruto', avatar: '/images/bg_forest.jpg' }), '/images/naruto.jpg');
  assert.equal(resolveNpcArtwork({ name: 'Ninja genérico', avatar: '👹' }), null);
  assert.equal(localArtworkPath('https://unknown.example/image.png'), null);
  assert.equal(localArtworkPath('/images/../secret.png'), null);
  assert.equal(localArtworkPath('/images/chars/ninja.png'), '/images/chars/ninja.png');
});

test('World Boss não usa o cenário do mapa como imagem da criatura', () => {
  assert.equal(resolveWorldBossArtwork({ name: 'Kurama', avatar: '/images/bg_forest.jpg' }), null);
  assert.equal(resolveWorldBossArtwork({ name: 'Kurama', boss_image: '/images/bosses/kurama.webp' }), '/images/bosses/kurama.webp');
  assert.equal(resolveWorldBossArtwork({ name: 'Kurama', boss_image: 'https://example.org/kurama.webp' }), null);
});
