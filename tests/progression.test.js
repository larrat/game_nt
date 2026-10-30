import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MISSION_TABS,
  normalizeRankName,
  findRankIndex,
  getMissionBlockReason,
  formatMissionCompletionMessage
} from '../src/utils/progression.js';

const ranks = [
  { id: 'estudante', title: 'Estudante da Academia' },
  { id: 'genin', title: 'Genin' },
  { id: 'chunin', title: 'Chunin' },
  { id: 'jonin', title: 'Jonin' },
  { id: 'anbu', title: 'ANBU' },
  { id: 'sannin', title: 'Sannin Lendário' },
  { id: 'heroi', title: 'Herói Mundial' }
];

test('rank atual aceita identificadores e títulos salvos no Supabase', () => {
  assert.equal(findRankIndex(ranks, 'Estudante da Academia'), 0);
  assert.equal(findRankIndex(ranks, 'estudante'), 0);
  assert.equal(findRankIndex(ranks, 'Genin'), 1);
  assert.equal(findRankIndex(ranks, 'Chunin'), 2);
  assert.equal(findRankIndex(ranks, 'Jounin'), 3);
  assert.equal(findRankIndex(ranks, 'Herói'), 6);
  assert.equal(findRankIndex(ranks, 'Herói Mundial'), 6);
  assert.equal(findRankIndex(ranks, 'graduação desconhecida'), -1);
  assert.equal(findRankIndex(ranks, null), -1);
  assert.equal(normalizeRankName('  Sannin   Lendário '), 'sannin');
});

test('catálogo oferece Academia e os cinco ranks de missão', () => {
  assert.deepEqual(MISSION_TABS.map(t => t.id), ['tarefa_academia', 'D', 'C', 'B', 'A', 'S']);
  assert.equal(MISSION_TABS.find(t => t.id === 'D').minLevel, 1);
  assert.equal(MISSION_TABS.find(t => t.id === 'A').minLevel, 35);
  assert.equal(MISSION_TABS.find(t => t.id === 'S').minLevel, 45);
});

test('visibilidade não libera início de missões bloqueadas', () => {
  const rankS = { type: 'S', reqLevel: 45 };
  assert.equal(getMissionBlockReason(rankS, 44, 0, 1), 'Nv.45');
  assert.equal(getMissionBlockReason(rankS, 45, 1, 1), 'Sem slots');
  assert.equal(getMissionBlockReason(rankS, 45, 0, 1), null);
  assert.equal(getMissionBlockReason({ type: 'D', reqLevel: 1 }, 1, 0, 1), null);
});

test('recibo de missão utiliza valores confirmados no servidor, não os anunciados na tela', () => {
  const response = { success: true, xp_gained: 1782, ryous_gained: 220, levels_gained: 0, new_rank: 'Genin' };
  assert.equal(formatMissionCompletionMessage(response, 'Estudante da Academia'), 'Missão concluída! +1.782 XP e RY$ 220. Nova graduação: Genin!');
  assert.equal(formatMissionCompletionMessage({}, 'Genin'), 'Missão concluída! Confira seu saldo e experiência atualizados.');
});
