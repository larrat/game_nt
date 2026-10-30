import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../migrations/060_block_replayed_mission_rewards.sql', import.meta.url), 'utf8');

const functionBody = (name) => {
  const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.' + name + '(');
  assert.ok(start >= 0, name + ': RPC ausente');
  const next = sql.indexOf('CREATE OR REPLACE FUNCTION public.', start + 5);
  return sql.slice(start, next < 0 ? sql.length : next);
};

test('as duas RPCs autenticam e bloqueiam a linha antes de verificar duplicidade', () => {
  for (const name of ['iniciar_missao', 'finalizar_missao']) {
    const body = functionBody(name);
    assert.match(body, /auth\.uid\(\) IS NULL/);
    assert.match(body, /v_player\.user_id IS DISTINCT FROM auth\.uid\(\)/);
    assert.match(body, /FOR UPDATE/);
    assert.match(body, /v_player\.completed_missions/);
    assert.match(body, /jsonb_build_array\(p_mission_id\)/);
    assert.match(body, /Esta missão já foi concluída/);
    assert.ok(body.indexOf('FOR UPDATE') < body.indexOf('Esta missão já foi concluída'));
  }
});

test('recompensas e tempo vêm do catálogo do servidor, não dos argumentos do cliente', () => {
  const start = functionBody('iniciar_missao');
  const finish = functionBody('finalizar_missao');
  assert.match(start, /v_mission\.time_seconds/);
  assert.doesNotMatch(start, /make_interval\(secs\s*=>\s*p_duration_seconds\)/);
  assert.match(finish, /v_mission\.xp/);
  assert.match(finish, /v_mission\.ryous/);
  assert.doesNotMatch(finish, /xp\s*=\s*[^\n]*p_mission_xp/);
  assert.doesNotMatch(finish, /ryous\s*=\s*[^\n]*p_mission_ryous/);
  assert.match(finish, /completed_missions = v_completed/);
});

test('o banco preserva permissões apenas para autenticados e rejeita estados JSON inválidos', () => {
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.iniciar_missao\(integer, integer, integer\) FROM PUBLIC, anon/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.iniciar_missao\(integer, integer, integer\) TO authenticated/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.finalizar_missao\(integer, integer, integer, integer, text\) FROM PUBLIC, anon/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.finalizar_missao\(integer, integer, integer, integer, text\) TO authenticated/);
  for (const name of ['iniciar_missao', 'finalizar_missao']) {
    assert.match(functionBody(name), /Estado de missões concluídas inválido/);
  }
});

test('a liquidação verifica histórico antes de calcular XP e Ryous', () => {
  const finish = functionBody('finalizar_missao');
  const replay = finish.indexOf('Esta missão já foi concluída.');
  const gain = finish.indexOf('v_new_xp :=');
  const credit = finish.indexOf('UPDATE public.players\n    SET active_missions =');
  assert.ok(replay > -1 && gain > replay && credit > gain);
});
