import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const migration=readFileSync(new URL('../migrations/068_critical_fk_indexes_20261101.sql',import.meta.url),'utf8');
test('critical player and combat lookups have safe indexes without modifying data',()=>{
  for(const name of [
    'idx_avatars_character_id','idx_npcs_character_id',
    'idx_battle_logs_player_created','idx_player_combat_sessions_player_status',
    'idx_player_inventory_player_id','idx_player_jutsus_jutsu_id'
  ]) assert.ok(migration.includes('CREATE INDEX IF NOT EXISTS '+name),name);
  assert.ok(!migration.includes('DROP TABLE'));
  assert.ok(!migration.includes('TRUNCATE'));
  assert.ok(!migration.includes('DELETE FROM'));
  assert.ok(!migration.includes('UPDATE public.players'));
});
