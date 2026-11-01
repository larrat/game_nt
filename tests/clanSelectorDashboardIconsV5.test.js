import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { normalizeClanName } from '../src/utils/clanArtwork.js';
import { RESOURCE_ICON_PATHS, getResourceIcon } from '../src/utils/resourceIconRegistry.js';

const read = path => readFileSync(path, 'utf8');

test('clan picker makes selection visible, searchable and unambiguous', () => {
  const selector = read('src/components/ClanSelector.jsx');
  const screen = read('src/pages/Clas.jsx');
  const css = read('src/styles/clan-selector-v5.css');
  assert.equal(normalizeClanName('Clã Uchiha'), normalizeClanName('Uchiha'));
  assert.equal(normalizeClanName('Hyūga'), 'hyuga');
  assert.match(selector, /aria-pressed=\{selectedClan && selectedExplicit\}/);
  assert.match(selector, /aria-live="polite"/);
  assert.match(selector, /type="search"/);
  assert.match(selector, /registro #\{selected.id\}/);
  assert.match(selector, /selectedIndex \+ 1/);
  assert.match(selector, /<ClanArtwork clan=\{selected\}/);
  assert.match(screen, /<ClanSelector clans=\{clansData\}/);
  assert.doesNotMatch(screen, /CAROUSEL CLAN SELECTION/);
  assert.match(css, /max-height:365px/);
  assert.match(css, /max-width:720px/);
});

test('dashboard is operational and status remains the single detailed character sheet', () => {
  const dashboard = read('src/pages/Dashboard.jsx');
  const status = read('src/pages/Status.jsx');
  const topbar = read('src/components/TopBar.jsx');
  assert.match(dashboard, /kuro-dashboard-operations/);
  assert.match(dashboard, /CENTRO DE OPERAÇÕES/);
  assert.match(dashboard, /navigate\("\/status"\)/);
  assert.doesNotMatch(dashboard, /kuro-hero__portrait|<ResourceMeter|<AvatarModal/);
  assert.match(status, /BASIC_ATTRIBUTES\.map/);
  assert.match(status, /derivedAttributes\.map/);
  assert.match(status, /getStatusAccountRows\(player\)/);
  assert.match(topbar, /kuro-rpg-topbar__resources/);
});

test('HUD and character status share canonical existing image assets for 4 resources', () => {
  const hud = read('src/components/TopBar.jsx');
  const status = read('src/pages/Status.jsx');
  const meter = read('src/components/CharacterResourceMeter.tsx');
  const keys = ['hp', 'chakra', 'stamina', 'xp'];
  assert.deepEqual(Object.keys(RESOURCE_ICON_PATHS), keys);
  for (const key of keys) {
    assert.ok(existsSync('public' + getResourceIcon(key)), key);
  }
  assert.equal(getResourceIcon('unknown'), null);
  assert.match(hud, /RESOURCE_ICON_PATHS\.hp/);
  assert.match(hud, /RESOURCE_ICON_PATHS\.chakra/);
  assert.match(status, /RESOURCE_ICON_PATHS\.hp/);
  assert.match(status, /RESOURCE_ICON_PATHS\.xp/);
  assert.match(meter, /<img src=\{icon\}/);
  assert.doesNotMatch(status, /label: 'Vida', icon: '♥'/);
});
