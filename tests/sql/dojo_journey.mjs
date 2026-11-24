import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const migration = file => readFile(new URL('../../migrations/' + file, import.meta.url), 'utf8');
const account = '11111111-1111-4111-8111-111111111111';
const dir = await mkdtemp(join(tmpdir(), 'kurokage-dojo-'));
let db;

function functionFrom(source, name) {
  // Execute the unchanged function definition from its migration, not a double.
  const marker = 'CREATE OR REPLACE FUNCTION public.' + name + '(';
  const i = source.indexOf(marker);
  assert.notEqual(i, -1, 'Missing migration function: ' + name);
  const def = source.slice(i);
  const dollar = /\$(?:function\$|\$)/.exec(def);
  assert.ok(dollar, 'Missing dollar-quoted definition: ' + name);
  const close = def.indexOf(dollar[0], dollar.index + dollar[0].length);
  assert.ok(close > dollar.index, 'Unterminated definition: ' + name);
  return def.slice(0, def.indexOf(';', close + dollar[0].length) + 1);
}

async function row(sql, params = []) {
  const { rows } = await db.query(sql, params);
  assert.equal(rows.length, 1);
  return rows[0];
}

async function rpc(call, params) {
  return (await row('SELECT public.' + call + ' AS result', params)).result;
}

async function verifyAuth() {
  await db.exec('SET ROLE authenticated');
  await row("SELECT set_config('request.jwt.claim.sub',$1,false)", [account]);
}

async function fight(player, opponent) {
  const session = await rpc('iniciar_combate_sessao($1,$2,false,true)', [player, opponent]);
  assert.equal(session.success, true, JSON.stringify(session));
  for (let i = 0; i < 6; i++) {
    const turn = await rpc("resolver_turno_combate_sessao($1,$2,'basic')", [player, session.session_id]);
    assert.equal(turn.success, true, JSON.stringify(turn));
    if (turn.enemy_defeated) return { id: session.session_id, turns: turn.turn_count };
    const reply = await rpc('responder_turno_combate_sessao($1,$2)', [player, session.session_id]);
    assert.equal(reply.success, true, JSON.stringify(reply));
    assert.equal(reply.player_defeated, false);
  }
  assert.fail('Synthetic enemy was not defeated in six turns');
}

async function settle(player, session) {
  return rpc("finalizar_combate_sessao($1,$2,$3,'[]'::jsonb)", [player, session.id, session.turns]);
}

try {
  db = await PGlite.create(dir);
  const { version } = await row("SELECT current_setting('server_version') AS version");
  await db.exec(await readFile(new URL('./dojo_journey_fixture.sql', import.meta.url), 'utf8'));
  const combat = await migration('037_authoritative_pve_sessions.sql');
  const sessionTables = combat.match(/CREATE TABLE IF NOT EXISTS public\.player_combat_sessions \([\s\S]+?\n\);[\s\S]+?ADD COLUMN IF NOT EXISTS exam_round integer;/);
  const examTable = combat.match(/CREATE TABLE IF NOT EXISTS public\.player_chunin_exams \([\s\S]+?\n\);/);
  assert.ok(sessionTables && examTable, 'Expected production session table definitions');
  await db.exec(sessionTables[0] + '\n' + examTable[0]);
  for (const [source, names] of [
    [await migration('009_migracao_xp_combate_treino.sql'), ['calcular_level_por_xp']],
    [await migration('034_server_authoritative_economy.sql'), ['kurokage_roll_loot']],
    [combat, ['kurokage_equipment_bonus', 'kurokage_player_max_stat', 'kurokage_elemental_multiplier',
      'resolver_turno_combate_sessao', 'responder_turno_combate_sessao']],
    [await migration('048_prevent_duplicate_combat_settlement.sql'), ['finalizar_combate_sessao']],
    [await migration('053_prevent_active_combat_reset.sql'), ['iniciar_combate_sessao']],
    [await migration('061_protect_refinement_favorites_and_loot_tiers.sql'), ['finalizar_combate']]
  ]) {
    for (const name of names) await db.exec(functionFrom(source, name));
  }
  await db.exec(await migration('058_batch_attribute_training.sql'));
  await db.exec(await migration('073_secure_character_starting_avatars.sql'));
  await verifyAuth();
  await row('SELECT setseed(0.2)');
  const created = await rpc("criar_personagem('Ninja Fixture',1,'fixture','fixture-base','NIN')", []);
  assert.equal(created.success, true, JSON.stringify(created));
  const id = created.player.id;
  assert.equal(created.player.pontos_atributos, 0);
  assert.equal((await rpc("treinar_atributos($1,'energia',1)", [id])).success, false);

  // Earn a training point through normal progression, with a synthetic leveling NPC.
  const intro = await settle(id, await fight(id, 1));
  assert.equal(intro.success, true, JSON.stringify(intro));
  assert.equal(intro.levels_gained, 1);
  const before = await row('SELECT energia,pontos_atributos,xp,ryous,wins_dojo FROM players WHERE id=$1', [id]);
  assert.equal(before.pontos_atributos, 5);
  const train = await rpc("treinar_atributos($1,'energia',1)", [id]);
  assert.equal(train.success, true, JSON.stringify(train));
  assert.ok(train.gained > 0);
  assert.equal(train.remaining_points, before.pontos_atributos - 1);

  const session = await fight(id, 2);
  const reward = await settle(id, session);
  assert.equal(reward.success, true, JSON.stringify(reward));
  assert.equal(reward.session_settled, true);
  assert.deepEqual([reward.xp_gained, reward.ryous_gained], [25, 12]);
  const repeated = await settle(id, session);
  assert.equal(repeated.success, false, JSON.stringify(repeated));

  // Close/reopen the database, then verify persisted game totals via a fresh session.
  await db.close();
  db = await PGlite.create(dir);
  await verifyAuth();
  assert.deepEqual(await row('SELECT energia,pontos_atributos,xp,ryous,wins_dojo FROM players WHERE id=$1', [id]), {
    energia: before.energia + train.gained,
    pontos_atributos: before.pontos_atributos - 1,
    xp: before.xp + 25,
    ryous: before.ryous + 12,
    wins_dojo: before.wins_dojo + 1
  });
  assert.deepEqual(await row(
    "SELECT count(*)::integer AS wins FROM battle_logs WHERE player_id=$1 AND enemy_name='Adversário de teste' AND result='win'", [id]),
  { wins: 1 });
  console.log('PASS: local PostgreSQL ' + version + '; creation, earned training, Dojo, one reward, reopened persistence');
} finally {
  if (db && !db.closed) await db.close();
  await rm(dir, { recursive: true, force: true });
}
