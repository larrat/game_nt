import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogOpponent, createPlayerShadow, OPPONENT_ORIGINS } from '../src/utils/opponentRoster.js';

test('qualquer personagem cadastrado pode virar entrada de NPC visual sem liberar combate', () => {
  const entry = createCatalogOpponent({
    id: 'ng-initial-53', name: 'Akasuna no Sasori',
    base_avatar_url: 'https://narutogame.com.br/assets/images/logado/profile/53/1.png'
  });
  assert.deepEqual({
    id: entry.id, name: entry.name, avatar: entry.avatar,
    origin: entry.opponent_origin, ready: entry.combat_ready
  }, {
    id: 'catalog_ng-initial-53', name: 'Akasuna no Sasori', avatar: null,
    origin: OPPONENT_ORIGINS.CATALOG, ready: false
  });
  assert.equal(createCatalogOpponent({ id: '4', name: 'Kakashi', base_avatar_url: '/images/kakashi.jpg' }).avatar, '/images/kakashi.jpg');
  assert.equal(createCatalogOpponent({ id: 'a', name: 'Exemplo', base_avatar_url: '/images/../secret.jpg' }).avatar, null);
  assert.equal(createCatalogOpponent({ id: null, name: 'Incompleto' }), null);
});

test('sombra do jogador usa apenas campos públicos e exclui a própria conta', () => {
  const p = { id: 12, name: 'Ninja de Teste', avatar: '/images/avatares/sasuke_01_kunai.png',
    level: 21, rank: 'Chunin', element: 'Katon', private_email: 'nao-copiar@example.com',
    user_id: 'nao-copiar', jutsus_learned: [1, 2] };
  const shadow = createPlayerShadow(p, 99);
  assert.equal(shadow.opponent_origin, OPPONENT_ORIGINS.PLAYER_SHADOW);
  assert.equal(shadow.id, 'ghost_12');
  assert.equal(shadow.name, 'Ninja de Teste');
  assert.equal(shadow.avatar, '/images/avatares/sasuke_01_kunai.png');
  assert.equal(shadow.level, 21);
  assert.equal(shadow.is_ghost, true);
  assert.equal(shadow.private_email, undefined);
  assert.equal(shadow.user_id, undefined);
  assert.equal(shadow.jutsus_learned, undefined);
  assert.equal(createPlayerShadow(p, 12), null);
  assert.equal(createPlayerShadow({ id: 1, name: 'Ninja', level: 0 }, 2), null);
});

test('projeção não carrega URL remota nem herda campos privados', () => {
  const result = createPlayerShadow({ id: 2, name: 'Naruto Uzumaki',
    level: 11, avatar: 'https://narutogame.com.br/avatar.png', email: 'secret@invalid' }, 1);
  assert.equal(result.avatar, null);
  assert.equal(result.email, undefined);
});
