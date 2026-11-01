import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../migrations/066_world_boss_weekly_lifecycle_20261101.sql', import.meta.url), 'utf8');

test('world boss cron no longer reads removed legacy event table', () => {
  assert.ok(sql.includes("cron.schedule("));
  assert.ok(sql.includes("'close_kyuubi_event'"));
  assert.ok(sql.includes("'open_kyuubi_event'"));
  assert.ok(!sql.includes('FROM world_boss_events'));
  assert.ok(!sql.includes('distribute_boss_rewards('));
});
test('weekly reset cannot erase unarchived combat progress or double-run mid-round', () => {
  assert.ok(sql.includes('FOR UPDATE'));
  assert.ok(sql.includes('is_active IS TRUE'));
  assert.ok(sql.includes('world_boss_round_damage_archive'));
  assert.ok(sql.includes('ON CONFLICT(event_id,previous_ends_at,player_id)'));
  assert.ok(sql.indexOf('INSERT INTO app_private.world_boss_round_damage_archive') <
    sql.indexOf('DELETE FROM public.world_boss_damage'));
  assert.ok(sql.includes('v_day <> 1'));
});
test('World Boss scheduler is private and reward authority stays on server', () => {
  assert.ok(sql.includes('SECURITY DEFINER'));
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION app_private.rollover_world_boss_weekly()'));
  assert.ok(sql.includes("NOT EXISTS("));
  assert.ok(sql.includes('UPDATE public.global_events e SET is_active=false'));
});
