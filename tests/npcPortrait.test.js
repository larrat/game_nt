import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getNpcPortrait, normalizeNpcName, PORTRAIT_RULES, PORTRAIT_VARIANTS } from '../src/utils/npcPortrait.js';

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
test('maps confirmed local art and generic NPCs from the live catalog', () => {
  assert.equal(getNpcPortrait({ id: 1, name: 'Naruto Uzumaki', avatar: '🍥' }), '/images/naruto.jpg');
  assert.equal(getNpcPortrait({ name: 'Sakura Haruno' }), '/images/sakura.jpg');
  assert.equal(getNpcPortrait({ name: 'Kakashi Hatake' }), '/images/kakashi.jpg');
  assert.equal(getNpcPortrait({ id: 17, name: 'Bandido do Deserto', avatar: '🥷' }), null);
  assert.equal(getNpcPortrait({ id: 18, name: 'Mercenário da Névoa', avatar: '👺' }), null);
  // Legacy record points to a non-existent root path; presentation must resolve the real asset.
  assert.equal(getNpcPortrait({ id: 54, name: 'Ladrão de Pergaminhos', avatar: '/images/char_rogue_ninja_1782968348009.jpg' }), '/images/char_rogue_ninja_1782968348009.jpg');
  assert.equal(getNpcPortrait({ name: 'Kiba Inuzuka', avatar: '🐺' }), null);
});

test('uses available Sasuke forms only for matching variants', () => {
  assert.equal(getNpcPortrait({ name: 'Sasuke Uchiha — Susanoo' }), '/images/avatares/sasuke_23_susanoo.png');
  assert.equal(getNpcPortrait({ name: 'Sasuke Hebi' }), '/images/avatares/sasuke_19_hebi.png');
  assert.equal(getNpcPortrait({ name: 'Sasuke Chidori' }), '/images/avatares/sasuke_08_chidori.png');
  assert.equal(getNpcPortrait({ name: 'Sasuke Adulto' }), '/images/avatares/sasuke_27_adulto_full.png');
  assert.equal(getNpcPortrait({ name: 'Sasuke Sharingan' }), '/images/avatares/sasuke_07_sharingan.png');
  assert.equal(getNpcPortrait({ name: 'Naruto Susanoo' }), '/images/naruto.jpg');
});

test('distinguishes generated rogue NPCs from player ghosts', () => {
  assert.equal(getNpcPortrait({ id: 'rogue_1', name: 'Uchiha Renegado (Genin)', rank: 'Genin', avatar: '🥷' }), null);
  assert.equal(getNpcPortrait({ id: 'rogue_2', name: 'Senju Kage Renegado (Jounin)', rank: 'Jounin', avatar: '👹' }), null);
  assert.equal(getNpcPortrait({ id: 'ghost_1', name: 'Jogador', is_ghost: true, avatar: '🥷' }), null);
  assert.equal(getNpcPortrait({ id: 77, name: 'NPC sem arte', avatar: '👹' }), null);
  assert.equal(getNpcPortrait({ id: 'rogue_3', name: 'Outro', is_ghost: true, avatar: '🥷' }), null);
});

test('imagem do jogador não é confundida com personagem de mesmo nome', () => {
  assert.equal(getNpcPortrait({ id: 'ghost_2', name: 'Naruto Uzumaki', is_ghost: true, avatar: '/images/sasuke.jpg' }), '/images/sasuke.jpg');
  assert.equal(getNpcPortrait({ id: 'ghost_3', name: 'Sasuke Uchiha', opponent_origin: 'player_shadow', avatar: '🥷' }), null);
  assert.equal(getNpcPortrait({ id: 'ghost_4', name: 'Kakashi Hatake', is_ghost: true, avatar: 'https://example.invalid/photo.png' }), null);
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
  for (const variant of PORTRAIT_VARIANTS) {
    assert.ok(fs.existsSync('public' + variant.src), variant.key + ' should point to an existing asset');
  }
  for (const generated of [
    '/images/chars/char_rogue_ninja_1782968348009.jpg',
    '/images/chars/char_elite_kage_1782968356836.jpg'
  ]) {
    assert.ok(fs.existsSync('public' + generated), generated + ' should point to an existing asset');
  }
});
