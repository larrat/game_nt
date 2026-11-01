import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const app = read('src/App.jsx');
const tokens = read('src/styles/design-system-v4.css');
const dojo = read('src/pages/Dojo.jsx');
const dojoCss = read('src/styles/dojo-v4.css');
const dashboard = read('src/pages/Dashboard.jsx');
const icons = read('src/components/SidebarIcon.jsx');
const buttons = read('src/components/ui/GameAction.jsx');

test('design system v4 applies globally to the authenticated shell and maps legacy tokens', () => {
  assert.ok(app.includes("import './styles/design-system-v4.css'"));
  for (const token of ['--kuro-bg:', '--kuro-surface:', '--kuro-line:', '--kuro-gold:', '--kuro-red:', '--kuro-copy:', '--kuro-focus:']) {
    assert.ok(tokens.includes(token), token + ' should be defined');
  }
  for (const bridge of ['--kui-surface:', '--kui-border:', '--kx-amber:', '--kx-copy:']) {
    assert.ok(tokens.includes(bridge), bridge + ' should use shared colors');
  }
  assert.ok(tokens.includes('.app :is(.btn-primary'));
  assert.ok(tokens.includes(':focus-visible'));
  assert.ok(tokens.includes(':disabled'));
  assert.ok(tokens.includes('prefers-reduced-motion'));
});

test('Dojo uses reusable actions and icon registry without changing gameplay RPCs', () => {
  assert.ok(dojo.includes("import GameAction from '../components/ui/GameAction'"));
  assert.ok(dojo.includes("import SidebarIcon from '../components/SidebarIcon'"));
  assert.ok(dojo.includes("import '../styles/dojo-v4.css'"));
  assert.ok(!dojo.includes("rpc('reservar_raid_stamina'"));
  assert.ok(dojo.includes("rpc('resolver_limpeza_rapida'"));
  assert.ok(dojo.includes("rpc('listar_rivais_dojo'"));
  assert.ok(dojo.includes('loadCanonicalDojoNpcs'));
  assert.ok(dojo.includes('isMirror: false'));
  assert.ok(dojo.includes('disabled={raidUnavailable}'));
  for (const name of ['swords','shield','target','compass','flame','activity','zap','arrowRight']) {
    assert.ok(dojo.includes('name="' + name + '"'), 'Dojo should use shared icon ' + name);
  }
  assert.ok(dojo.includes('tone="danger"'));
  assert.ok(dojo.includes('kuro-dojo-v4__hero'));
  assert.ok(dojoCss.includes('grid-template-columns: repeat(2,minmax(0,1fr))'));
  assert.ok(dojoCss.includes('@media (max-width: 690px)'));
});

test('Painel uses the same named icons and a shortcut to roster', () => {
  assert.ok(dashboard.includes("import SidebarIcon from '../components/SidebarIcon'"));
  assert.ok(dashboard.includes('navigate("/adversarios")'));
  assert.ok(dashboard.includes('name="coins"'));
  assert.ok(dashboard.includes('name="trophy"'));
  assert.ok(dashboard.includes('name="swords"'));
  assert.ok(tokens.includes('.kuro-dashboard-v2 .kuro-shortcuts'));
});

test('global icons and reusable buttons define a single source of truth', () => {
  for (const name of ['activity','arrowRight','coins','compass','flame','shield','swords','target','users','zap']) {
    assert.match(icons, new RegExp('\\b' + name + ': [A-Z][A-Za-z]+,'));
  }
  assert.ok(buttons.includes("'danger'"));
  assert.ok(tokens.includes('.kui-action--danger'));
  assert.ok(buttons.includes('disabled={disabled || loading}'));
});
