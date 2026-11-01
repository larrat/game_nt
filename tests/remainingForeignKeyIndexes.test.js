import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql=readFileSync(new URL('../migrations/070_remaining_fk_indexes_20261101.sql',import.meta.url),'utf8');
test('remaining 20 foreign keys have idempotent non-destructive index migrations',()=>{
 assert.equal((sql.match(/CREATE INDEX IF NOT EXISTS/g)||[]).length,20);
 for(const table of ['players','world_boss_damage','world_boss_sessions','player_quests','clan_skills'])
   assert.ok(sql.includes('ON public.'+table+'('));
 for(const forbidden of ['DROP TABLE','DELETE FROM','UPDATE public.players','TRUNCATE','GRANT '])
   assert.ok(!sql.includes(forbidden),forbidden);
});
