import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(join(root, path), 'utf8');
const collect = (dir, files = []) => {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, item.name);
    if (item.isDirectory()) collect(file, files);
    else if (/\.(jsx?|tsx?)$/.test(item.name)) files.push(file);
  }
  return files;
};

// An explicit allowlist makes introducing a new full-player-table consumer a
// review event rather than silently expanding the exposed private-data surface.
const allowed = [
  'src/App.jsx',
  'src/pages/Criar.jsx',
  'src/pages/Exame.jsx',
  'src/pages/Selecionar.jsx'
];
const uses = collect(join(root, 'src'))
  .filter(file => /\.from\(\s*['"]players['"]\s*\)/.test(readFileSync(file, 'utf8')))
  .map(file => relative(root, file).split(sep).join('/'))
  .sort();

test('full player table reads are restricted to the expected owner-facing sources', () => {
  assert.deepEqual(uses, allowed);
  for (const filename of allowed.filter(x => x !== 'src/pages/Exame.jsx')) {
    assert.match(read(filename), /\.eq\(['"]user_id['"],\s*session\.user\.id\)/, filename);
  }
  const exam = read('src/pages/Exame.jsx');
  assert.match(exam, /\.eq\(['"]id['"],\s*player\.id\)/);
  assert.match(exam, /\.select\(['"]passou_exame_chunin['"]\)/);
});

test('owner-only SELECT migration removes broad authenticated read policy', () => {
  const sql = read('migrations/064_private_player_select_rls.sql');
  assert.match(sql, /DROP POLICY IF EXISTS players_select_authenticated ON public\.players/);
  assert.match(sql, /FOR SELECT TO authenticated/);
  assert.match(sql, /USING\s*\(user_id\s*=\s*\(SELECT auth\.uid\(\)\)\)/);
  assert.doesNotMatch(sql, /USING\s*\(\s*true\s*\)/i);
});

test('privacy preflight is read-only, checks SQL metadata and explicitly excludes real-user test claims', () => {
  const sql = read('scripts/preflight-private-player-rls.sql');
  assert.match(sql, /pg_policies/);
  assert.match(sql, /pg_proc/);
  assert.match(sql, /has_function_privilege/);
  assert.match(sql, /broad_select_still_active/);
  assert.match(sql, /usable_public_profile_rpc_count/);
  assert.match(sql, /two separate authenticated disposable sessions/i);
  assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|GRANT|REVOKE|TRUNCATE)\s+(TABLE|POLICY|FUNCTION|FROM|INTO|ON|public\.)/i);
  assert.doesNotMatch(sql, /\bFROM\s+public\.players\b/i);
});
