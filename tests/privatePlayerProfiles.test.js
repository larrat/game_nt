import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const rpc = read('migrations/063_public_player_profiles.sql');
const rls = read('migrations/064_private_player_select_rls.sql');
const ranking = read('src/pages/Ranking.jsx');
const village = read('src/pages/Vila.jsx');
const creation = read('src/pages/Criar.jsx');
const map = read('src/pages/Mapa.jsx');
const dojo = read('src/pages/Dojo.jsx');
const app = read('src/App.jsx');
const selection = read('src/pages/Selecionar.jsx');

test('public RPCs require authenticated access, expose explicit fields and forbid anonymous execution', () => {
  for (const fn of ['listar_perfis_ninja','listar_lideres_vila','contar_ninjas_vila','listar_rivais_dojo']) {
    assert.ok(rpc.includes('FUNCTION public.' + fn), fn);
    assert.ok(rpc.includes('REVOKE ALL ON FUNCTION public.' + fn), fn + ' revoke');
    assert.ok(rpc.includes('TO authenticated'), 'authenticated grants');
  }
  assert.ok(rpc.includes('IF auth.uid() IS NULL'));
  assert.ok(rpc.includes('SET search_path = pg_catalog, public, pg_temp'));
  assert.ok(!/jsonb_build_object\([\s\S]*?'user_id'/.test(rpc));
  assert.ok(!rpc.includes("'ryous'"));
  assert.ok(!rpc.includes("'vip_coins'"));
  assert.ok(rpc.includes('LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500)'));
});

test('dojo discovery is scoped to the owned player, same village and limited output', () => {
  assert.ok(rpc.includes('WHERE id=p_player_id AND user_id=auth.uid()'));
  assert.ok(rpc.includes('p.village_id=v_village_id'));
  assert.ok(rpc.includes('p.id<>p_player_id'));
  assert.ok(rpc.includes('LIMIT 5;'));
  assert.ok(rpc.includes("'jutsu_ids'"));
  assert.ok(!rpc.includes("'jutsus_learned',p.jutsus_learned"));
});

test('public screens do not select raw player rows', () => {
  for (const [name, source] of [
    ['Ranking',ranking], ['Vila',village], ['Mapa',map], ['Dojo',dojo]
  ]) {
    assert.ok(!source.includes(".from('players')"), name);
  }
  for (const rpcName of ['listar_perfis_ninja','listar_lideres_vila','contar_ninjas_vila','listar_rivais_dojo']) {
    assert.ok([ranking,village,creation,map,dojo].some(source => source.includes("rpc('"+rpcName+"'")), rpcName);
  }
  assert.ok(creation.includes("eq('user_id', session.user.id)"));
  assert.ok(selection.includes("eq('user_id', session.user.id)"));
  assert.ok(app.includes("eq('user_id', session.user.id)"));
  assert.ok(!map.includes('charCodeAt'));
});

test('RLS locks full player rows to the account owner only', () => {
  assert.ok(rls.includes('DROP POLICY IF EXISTS players_select_authenticated'));
  assert.ok(rls.includes('FOR SELECT TO authenticated'));
  assert.ok(rls.includes('USING (user_id = (SELECT auth.uid()))'));
  assert.ok(!rls.includes('USING (true)'));
});

test('unimplemented Jinchuuriki schema must not be queried as private player data', () => {
  assert.ok(!dojo.includes("eq('has_bijuu'"));
  assert.ok(dojo.includes('Caçada às Bijuus indisponível'));
});
