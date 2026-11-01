import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getHospitalViewState } from '../src/utils/hospitalState.js';

const file = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const at = Date.parse('2026-11-01T10:00:00Z');
const faintedAt = new Date(at).toISOString();

test('healthy player with full HP does not see a paid recovery', () => {
  assert.deepEqual(getHospitalViewState({ hp: 430, is_fainted: false, fainted_at: null }, at),
    { status: 'healthy', remainingSeconds: 0 });
  assert.equal(getHospitalViewState({ hp: 25, is_fainted: false, fainted_at: null }, at).status, 'healthy');
});

test('fainted player with full HP must receive server discharge after timer, not a charge', () => {
  assert.deepEqual(getHospitalViewState({ hp: 1580, is_fainted: true, fainted_at: faintedAt }, at + 300000),
    { status: 'ready_for_discharge', remainingSeconds: 0 });
});

test('paid hospital recovery only applies while time is outstanding', () => {
  assert.deepEqual(getHospitalViewState({ is_fainted: true, fainted_at: faintedAt }, at + 120000),
    { status: 'recovering', remainingSeconds: 180 });
  assert.equal(getHospitalViewState({ is_fainted: true, fainted_at: faintedAt }, at + 300001).status,
    'ready_for_discharge');
});

test('missing faint timestamp produces an error state instead of 0:00 or charging', () => {
  assert.equal(getHospitalViewState({ is_fainted: true, fainted_at: null }, at).status, 'needs_sync');
  assert.equal(getHospitalViewState({ is_fainted: true, fainted_at: 'not a date' }, at).status, 'needs_sync');
});

test('all authenticated route changes reset page and document scroll', () => {
  const app = file('src/App.jsx');
  assert.match(app, /useLayoutEffect\(\(\) => \{[\s\S]*?contentRef\.current\.scrollTop = 0;[\s\S]*?window\.scrollTo\(0, 0\);[\s\S]*?\}, \[pathname\]\)/);
  assert.match(app, /<main ref=\{contentRef\} className="main">/);
  assert.match(app, /if \(playerState\.is_fainted\)/);
  assert.doesNotMatch(app, /if \(playerState\.is_fainted \|\| playerState\.fainted_at\)/);
});

test('inventory modal escapes header stacking context through a portal', () => {
  const inventory = file('src/components/InventoryModal.jsx');
  const css = file('src/styles/inventory-modal.css');
  assert.match(inventory, /import \{ createPortal \} from 'react-dom'/);
  assert.match(inventory, /return createPortal\(/);
  assert.match(inventory, /document\.body/);
  assert.match(inventory, /aria-modal="true"/);
  assert.match(inventory, /event\.key === 'Escape'/);
  assert.match(css, /height: 100dvh/);
  assert.match(css, /overflow-y: auto/);
  assert.match(css, /max-height: calc\(100dvh - 20px\)/);
  assert.match(inventory, /\.from\('player_consumables'\)/);
  assert.doesNotMatch(inventory, /\.from\('player_inventory'\)/);
});

test('dashboard does not query the nonexistent world_events relation', () => {
  const dashboard = file('src/pages/Dashboard.jsx');
  assert.doesNotMatch(dashboard, /\.from\('world_events'\)/);
  assert.match(dashboard, /\.from\('global_events'\)/);
});
