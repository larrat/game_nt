import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('design foundations remain scoped and load after legacy shell CSS', () => {
  const app = read('../src/App.jsx');
  const css = read('../src/styles/design-foundations-v2.css');
  assert.match(app, /import '\.\/styles\/rpg-shell\.css';\s*import '\.\/styles\/design-foundations-v2\.css';/);
  assert.match(css, /\.app \{/);
  for (const token of ['--kui-bg:', '--kui-seal:', '--kui-gold:', '--kui-border-focus:', '--kui-space-4:']) {
    assert.ok(css.includes(token), 'Missing design token: ' + token);
  }
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /max-width: 600px/);
});

test('shared UI kit uses native progress and has no domain side effects', () => {
  const files = ['GameAction.jsx', 'GamePanel.jsx', 'GameEmptyState.jsx', 'ResourceMeter.jsx'];
  for (const filename of files) {
    const component = read('../src/components/ui/' + filename);
    assert.doesNotMatch(component, /style=\{\{/);
    assert.doesNotMatch(component, /supabase\.|\.rpc\(/);
  }
  const resource = read('../src/components/ui/ResourceMeter.jsx');
  assert.match(resource, /getResourceProgress\(current, max\)/);
  assert.match(resource, /<progress/);
  assert.match(resource, /aria-valuetext=/);
  const action = read('../src/components/ui/GameAction.jsx');
  assert.match(action, /disabled=\{disabled \|\| loading\}/);
  assert.match(action, /aria-busy=/);
});

test('dashboard pilot composes design components without changing game RPCs', () => {
  const dashboard = read('../src/pages/Dashboard.jsx');
  for (const component of ['GameAction', 'GamePanel', 'GameEmptyState', 'ResourceMeter']) {
    assert.match(dashboard, new RegExp('<' + component + '\\b'));
  }
  assert.match(dashboard, /reivindicar_recompensa_diaria/);
  assert.match(dashboard, /reivindicar_bonus_diario/);
  assert.match(dashboard, /reset_daily_progress/);
  assert.match(dashboard, /kuro-hero--village-/);
  assert.match(dashboard, /aria-label="Progresso de experiência no nível atual"/);
});
