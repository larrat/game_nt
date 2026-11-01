import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCREEN_NAV, filterScreenNavigation, findScreenGroup } from '../src/utils/screenNavigation.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const sidebarIcon = read('src/components/SidebarIcon.jsx');
const sidebar = read('src/components/Sidebar.jsx');
const css = read('src/styles/sidebar-v3.css');
const app = read('src/App.jsx');
const topBar = read('src/components/TopBar.jsx');
const allRoutes = SCREEN_NAV.flatMap(group => group.items.map(item => item.to));
const registry = new Set(
  [...sidebarIcon.matchAll(/^\s{2}([A-Za-z]+): [A-Z][A-Za-z]+,?$/gm)].map(match => match[1])
);

test('every category and destination has a mapped icon independent of label', () => {
  assert.equal(SCREEN_NAV.length, 6);
  assert.equal(allRoutes.length, 25);
  assert.equal(new Set(allRoutes).size, allRoutes.length, 'routes must be unique');
  for (const group of SCREEN_NAV) {
    assert.ok(group.id && group.group && group.items.length);
    assert.ok(registry.has(group.icon), 'missing group icon ' + group.icon);
    for (const item of group.items) {
      assert.ok(item.to.startsWith('/'), 'destination must be absolute');
      assert.ok(registry.has(item.icon), item.to + ' missing icon ' + item.icon);
      assert.equal(findScreenGroup(item.to), group.id);
    }
  }
  assert.ok(sidebarIcon.includes("from 'lucide-react'"));
  assert.ok(!sidebarIcon.includes("switch (label)"), 'icons must not depend on localized text');
});

test('search finds accented terms and can match a whole category', () => {
  const term = filterScreenNavigation('tecnicas');
  assert.deepEqual(term.flatMap(group => group.items.map(item => item.to)), ['/tecnicas']);
  assert.deepEqual(filterScreenNavigation('missoes').flatMap(group => group.items.map(item => item.to)), ['/tarefas']);
  assert.deepEqual(filterScreenNavigation('clas').flatMap(group => group.items.map(item => item.to)), ['/clas']);
  assert.equal(filterScreenNavigation('ACADEMIA ninja').length, 1);
  assert.equal(filterScreenNavigation('Academia Ninja')[0].items.length, 6);
  assert.equal(filterScreenNavigation('nao-existe').length, 0);
  assert.equal(filterScreenNavigation('  '), SCREEN_NAV);
});

test('sidebar uses a real search input, direct actions, accessible accordion and active routes', () => {
  assert.ok(sidebar.includes('filterScreenNavigation(searchQuery)'));
  assert.ok(sidebar.includes('type="search"'));
  assert.ok(sidebar.includes('aria-expanded={open}'));
  assert.ok(sidebar.includes('hidden={!open}'));
  assert.ok(sidebar.includes('aria-controls={'));
  assert.ok(sidebar.includes('disabled={searching}'));
  assert.ok(sidebar.includes('<NavLink'));
  assert.ok(sidebar.includes('setSearchQuery(\'\')'));
  assert.ok(sidebar.includes('<SidebarIcon name={item.icon} size={18} />'));
  for (const path of ['/dashboard', '/treino', '/tarefas']) assert.ok(sidebar.includes("to: '" + path + "'"));
});

test('sidebar style is installed, mobile compatible and keyboard visible', () => {
  assert.ok(app.includes("import './styles/sidebar-v3.css'"));
  assert.ok(css.includes('.kuro-rpg-sidebar-v3__quick-links'));
  assert.ok(css.includes('.navitem.active'));
  assert.ok(css.includes('focus-visible'));
  assert.ok(css.includes('max-width: 980px'));
  assert.ok(css.includes('prefers-reduced-motion'));
});

test('topbar mobile menu and inventory actions share the outline icon family', () => {
  assert.ok(topBar.includes("from 'lucide-react'"));
  assert.ok(topBar.includes('<Backpack size={19} strokeWidth={1.9}'));
  assert.ok(topBar.includes('<Menu size={20} strokeWidth={1.9}'));
  assert.ok(topBar.includes('<X size={20} strokeWidth={1.9}'));
  assert.ok(!topBar.includes('🎒'));
  assert.ok(css.includes('kuro-rpg-topbar__inventory'));
});
