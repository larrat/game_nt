import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../migrations/059_normalize_rank_aliases.sql', import.meta.url), 'utf8');

test('migração preserva assinaturas das RPCs e exige autenticação/propriedade', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.aprender_jutsu\(/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.promover_graduacao\(/);
  assert.equal((migration.match(/IF auth\.uid\(\) IS NULL/g) || []).length, 2);
  assert.match(migration, /v_player\.user_id IS DISTINCT FROM auth\.uid\(\)/);
  assert.match(migration, /WHERE id = p_player_id AND user_id = auth\.uid\(\)/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.aprender_jutsu\(integer, integer, integer\) TO authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.promover_graduacao\(integer, text\) TO authenticated/);
});

test('os nomes completos do catálogo são aceitos como graduações do jogador e requisito do jutsu', () => {
  for (const [alias, order] of [
    ["sannin lendário", 5], ["sannin lendario", 5],
    ["herói mundial", 6], ["heroi mundial", 6],
    ["estudante", 0]
  ]) {
    const literal = `WHEN '${alias}' THEN ${order}`;
    assert.equal(migration.split(literal).length - 1, 2, literal);
  }
  assert.match(migration, /ELSE -1 END;/);
  assert.match(migration, /IF v_player_rank < 0 THEN/);
});

test('graduação desconhecida não é reiniciada silenciosamente como Estudante', () => {
  assert.doesNotMatch(migration,
    /SELECT \* INTO v_current FROM public\.ranks WHERE lower\(name_id\)='estudante'/);
  assert.match(migration, /Graduação atual não reconhecida/);
});
