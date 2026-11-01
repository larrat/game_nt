import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getNpcPortrait, normalizeNpcName, PORTRAIT_RULES } from '../src/utils/npcPortrait.js';

test('resolves boss art by canonical name and aliases', () => {
  for (const name of ['Kurama', 'A Kurama — World Boss', 'Kyūbi', 'Raposa de Nove Caudas', 'A Fúria da Raposa']) {
    assert.equal(getNpcPortrait({ name, avatar: '/images/bg_forest.jpg' }), '/images/bosses/raposa-nove-caudas.svg');
  }
});
test('resolves Naruto and Sasuke in NPC battle while preserving other real portraits', () => {
  assert.equal(getNpcPortrait({ name: 'Naruto Uzumaki', avatar: '🥷' }), '/images/naruto.jpg');
  assert.equal(getNpcPortrait({ name: 'Sasuke Uchiha' }), '/images/sasuke.jpg');
  assert.equal(getNpcPortrait({ name: 'Ninja da Folha', avatar: '/images/custom-npc.png' }), '/images/custom-npc.png');
  assert.equal(getNpcPortrait({ name: 'Ninja da Folha', image_url: 'https://example.com/unavailable.jpg', avatar: '/images/custom-npc.png' }), '/images/custom-npc.png');
  assert.equal(getNpcPortrait({ name: 'Ninja da Folha', avatar: '🥷' }), null);
  assert.equal(getNpcPortrait({ name: 'Sasukex' }), null);
});
test('refuses unapproved external paths and docs paths', () => {
  assert.equal(getNpcPortrait({ name: 'Outro', avatar: 'https://narutogame.com.br/example.png' }), null);
  assert.equal(getNpcPortrait({ name: 'Outro', avatar: '//bad.invalid/pic' }), null);
  assert.equal(getNpcPortrait({ name: 'Outro', avatar: '/images/../docs/asset.png' }), null);
  assert.equal(normalizeNpcName('Kyūbi'), 'kyubi');
});
test('all registered art paths exist in the public app directory', () => {
  for (const rule of PORTRAIT_RULES) {
    assert.ok(fs.existsSync('public' + rule.src), rule.key + ' should point to an existing asset');
  }
});
