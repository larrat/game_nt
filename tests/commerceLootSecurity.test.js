import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getRefinableItems } from '../src/utils/refinement.js';

const ddl = readFileSync(new URL('../migrations/061_protect_refinement_favorites_and_loot_tiers.sql', import.meta.url), 'utf8');
const func = (name) => {
  const start = ddl.indexOf('CREATE OR REPLACE FUNCTION public.' + name + '(');
  assert.ok(start >= 0, 'função ausente: ' + name);
  const end = ddl.indexOf('CREATE OR REPLACE FUNCTION public.', start + 5);
  return ddl.slice(start, end < 0 ? ddl.length : end);
};

test('somente duplicatas não equipadas e não favoritas podem ser consumidas', () => {
  const a = { id: 1, item_id: 8, is_favorite: true, is_equipped: false, upgrade_level: 1, items: { id: 8 } };
  const b = { id: 2, item_id: 8, is_favorite: true, is_equipped: false, upgrade_level: 0, items: { id: 8 } };
  assert.deepEqual(getRefinableItems([a, b]), []);
  const c = { id: 3, item_id: 8, is_favorite: false, is_equipped: true, upgrade_level: 0, items: { id: 8 } };
  assert.deepEqual(getRefinableItems([a, c]), []);
  const d = { id: 4, item_id: 8, is_favorite: false, is_equipped: false, upgrade_level: 0, items: { id: 8 } };
  assert.deepEqual(getRefinableItems([a, d]).map(i => i.id), [1]);
  assert.deepEqual(getRefinableItems([a, b, d]).map(i => i.id), [1, 2]);
  assert.deepEqual(getRefinableItems([{ ...a, id: 11, is_favorite: false, upgrade_level: 10 }, d]).map(i => i.id), [4]);
});

test('o SQL de refino exige dono, cópia não equipada/não favorita e saldo do servidor', () => {
  const forge = func('aprimorar_equipamento');
  assert.match(forge, /v_player_user_id IS DISTINCT FROM auth\.uid\(\)/);
  assert.match(forge, /pi\.id <> p_inventory_item_id/);
  assert.match(forge, /COALESCE\(pi\.is_equipped, false\) = false/);
  assert.match(forge, /COALESCE\(pi\.is_favorite, false\) = false/);
  assert.match(forge, /v_upgrade_cost := 500 \* \(COALESCE\(v_target_item\.upgrade_level, 0\) \+ 1\)/);
  assert.match(forge, /COALESCE\(v_player_ryous, 0\) < v_upgrade_cost/);
  assert.match(forge, /DELETE FROM public\.player_inventory WHERE id = v_duplicate_id/);
});

test('limpeza rápida e combate normal reconhecem títulos avançados e preservam o mesmo tier', () => {
  for (const name of ['finalizar_combate', 'resolver_limpeza_rapida']) {
    const sql = func(name);
    for (const [alias, tier] of [
      ['sannin', 4], ['sannin lendário', 4], ['sannin lendario', 4],
      ['herói', 5], ['heroi', 5], ['herói mundial', 5], ['heroi mundial', 5]
    ]) {
      assert.ok(sql.includes(`WHEN '${alias}' THEN ${tier}`), `${name}: ${alias}`);
    }
    assert.match(sql, /v_essence_key := v_essence_type \|\| '_' \|\| v_tier::text/);
  }
});

test('RPC interna de recompensa continua proibida a authenticated e anon', () => {
  assert.match(ddl, /REVOKE ALL ON FUNCTION public\.finalizar_combate\(integer, integer, text, integer, jsonb, integer, integer, text, boolean\) FROM PUBLIC, anon, authenticated/);
  assert.match(ddl, /GRANT EXECUTE ON FUNCTION public\.finalizar_combate\(integer, integer, text, integer, jsonb, integer, integer, text, boolean\) TO service_role/);
  assert.match(ddl, /GRANT EXECUTE ON FUNCTION public\.aprimorar_equipamento\(bigint, bigint\) TO authenticated/);
  assert.match(ddl, /GRANT EXECUTE ON FUNCTION public\.resolver_limpeza_rapida\(integer, integer\) TO authenticated/);
});
