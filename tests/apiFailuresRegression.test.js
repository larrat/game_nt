import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fetchActiveWorldBoss, fetchActiveGlobalEvents, isEventExpired } from '../src/utils/eventUtils.js';

const file = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
function supabaseMock(rows) {
  const operations = [];
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => ({ data: rows[0] || null, error: null }),
    then(resolve) { return Promise.resolve({ data: rows, error: null }).then(resolve); }
  };
  return {
    operations,
    from(table) {
      operations.push(table);
      return builder;
    }
  };
}

test('expired world boss never fabricates time/HP or writes from the browser', async () => {
  const old = { id: 1, is_active: true, is_world_boss: true,
    ends_at: '2026-07-24T03:00:00Z', boss_hp: 500000 };
  const mock = supabaseMock([old]);
  assert.equal(isEventExpired(old), true);
  assert.equal(await fetchActiveWorldBoss(mock), null);
  assert.equal(mock.operations.length, 1);
  const globalMock = supabaseMock([old]);
  assert.deepEqual(await fetchActiveGlobalEvents(globalMock), []);
  const source = file('src/utils/eventUtils.js');
  assert.doesNotMatch(source, /\.update\(/);
  assert.doesNotMatch(source, /new Date\(Date\.now\(\) \+ WEEK_MS\)/);
});

test('valid live boss is delivered unchanged and never mutated', async () => {
  const event = { id: 2, is_active: true, is_world_boss: true,
    boss_hp: 200, ends_at: '2099-01-01T00:00:00Z' };
  const mock = supabaseMock([event]);
  assert.strictEqual(await fetchActiveWorldBoss(mock), event);
  assert.deepEqual(await fetchActiveGlobalEvents(supabaseMock([event])), [event]);
});

test('world event component no longer spins on expired event timers', () => {
  const source = file('src/pages/Evento.jsx');
  assert.ok(source.includes("setTimeLeft('Encerrado')"));
  assert.doesNotMatch(source, /setTimeLeft\('Renovando\.\.\.'\)/);
});

test('VIP buttons cannot invoke absent economic RPCs', () => {
  const source = file('src/pages/Vip.jsx');
  assert.ok(source.includes('disabled={!vipResetAvailable}'));
  assert.ok(source.includes('useState(false)'));
  assert.ok(source.includes("'vip_point_respec_enabled'"));
  assert.ok(!source.includes("rpc('vip_reset_personagem'"));
});

test('defeat screen never attempts an unauthorized direct history INSERT', () => {
  const combat = file('src/pages/Combate.jsx');
  assert.ok(combat.includes("rpc('marcar_jogador_derrotado'"));
  assert.doesNotMatch(combat, /\.from\(['"]battle_logs['"]\)\.insert\(/);
});
