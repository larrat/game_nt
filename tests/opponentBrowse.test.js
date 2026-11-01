import test from 'node:test';
import assert from 'node:assert/strict';
import { filterOpponentRows, toOpponentRows, opponentStatus, OPPONENT_TABS } from '../src/utils/opponentBrowse.js';
import { OPPONENT_ORIGINS } from '../src/utils/opponentRoster.js';

test('catálogo inclui personagens sem baixar imagens externas', () => {
  const rows = toOpponentRows('catalog', [
    { id: 'ng-initial-53', name: 'Akasuna no Sasori', base_avatar_url: 'https://narutogame.com.br/image.png' },
    { id: '4', name: 'Kakashi Hatake', base_avatar_url: '/images/kakashi.jpg' }
  ], 1);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].avatar, '🥷');
  assert.equal(rows[1].avatar, '/images/kakashi.jpg');
  assert.equal(rows[0].opponent_origin, OPPONENT_ORIGINS.CATALOG);
  assert.equal(rows[0].combat_ready, false);
});

test('NPCs exibidos são ativos e não habilitam combate pelo catálogo', () => {
  const rows = toOpponentRows('npc', [
    { id: 1, name: 'Naruto Uzumaki', is_active: true, is_map_npc: true },
    { id: 2, name: 'Inativo', is_active: false },
    { id: 3, name: 'Rock Lee', is_active: true, is_map_npc: false }
  ], 8);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].combat_ready, false);
  assert.equal(opponentStatus('npc', rows[0]), 'Encontrável no mapa');
  assert.equal(opponentStatus('npc', rows[1]), 'NPC do Dojo ou história');
});

test('jogadores não expõem campos privados e excluem o avatar do usuário atual', () => {
  const rows = toOpponentRows('players', [
    { id: 1, name: 'Meu Ninja', level: 12 },
    { id: 2, name: 'Outro Ninja', level: 15, email: 'privado@example.test', user_id: 'secret' }
  ], 1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Outro Ninja');
  assert.equal(rows[0].opponent_origin, OPPONENT_ORIGINS.PLAYER_SHADOW);
  assert.equal(rows[0].email, undefined);
  assert.equal(rows[0].user_id, undefined);
  assert.equal(opponentStatus('players', rows[0]), 'Projeção pública');
});

test('busca é tolerante a acentos, não altera fonte e inclui patente', () => {
  const rows = [
    { name: 'Mercenário da Névoa', rank: 'Chunin' },
    { name: 'Sasuke Uchiha', rank: 'Genin' }
  ];
  assert.deepEqual(filterOpponentRows(rows, 'nevoa'), [rows[0]]);
  assert.deepEqual(filterOpponentRows(rows, 'CHUNIN'), [rows[0]]);
  assert.deepEqual(filterOpponentRows(rows, ''), rows);
  assert.equal(OPPONENT_TABS.length, 3);
  assert.equal(toOpponentRows('other', rows, 1).length, 0);
});
