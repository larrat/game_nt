import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../migrations/067_server_verified_combat_defeat_history_20261101.sql',import.meta.url),'utf8');
const combat = readFileSync(new URL('../src/pages/Combate.jsx',import.meta.url),'utf8');

test('combat defeat history is recorded only by an authoritative session status transition', () => {
  assert.ok(migration.includes('AFTER UPDATE OF status ON public.player_combat_sessions'));
  assert.ok(migration.includes("NEW.status='player_defeated'"));
  assert.ok(migration.includes('OLD.status IS DISTINCT FROM NEW.status'));
  assert.ok(migration.includes("'server_verified_pve'"));
  assert.ok(migration.includes("REVOKE ALL ON FUNCTION app_private.log_official_pve_defeat()"));
});
test('client cannot fabricate defeat logs or prize amounts', () => {
  assert.ok(!combat.includes(".from('battle_logs').insert("));
  assert.ok(migration.includes("'Derrota',0,0"));
  assert.ok(!migration.includes('GRANT INSERT ON public.battle_logs'));
});
