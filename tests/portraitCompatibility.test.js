import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('dashboard hero uses same HTTPS-capable portrait as header and sidebar', () => {
  const dashboard = read('src/pages/Dashboard.jsx');
  const status = read('src/pages/Status.jsx');
  const combat = read('src/pages/Combate.jsx');
  const fighter = read('src/components/CombatFighterCard.jsx');
  const sidebar = read('src/components/Sidebar.jsx');
  const header = read('src/components/TopBar.jsx');

  assert.match(dashboard, /import CharacterPortrait from/);
  assert.match(dashboard, /<CharacterPortrait src=\{player\.avatar\}/);
  assert.ok(!dashboard.includes('player.avatar?.startsWith("/")'));
  assert.match(status, /<CharacterPortrait src=\{player\.avatar\}/);
  assert.ok(!status.includes("player.avatar?.startsWith('/')"));
  assert.match(sidebar, /<CharacterPortrait src=\{player\.avatar\}/);
  assert.match(header, /<CharacterPortrait src=\{player\.avatar\}/);
  assert.match(combat, /portrait=\{player\.avatar \|\| '忍'\}/);
  assert.match(fighter, /isSupportedPortraitSource\(portrait\)/);
  assert.match(fighter, /<CharacterPortrait src=\{portrait\}/);
});

test('all avatar selection thumbnails use image fallback and keyboard buttons', () => {
  const modal = read('src/components/AvatarModal.jsx');
  assert.match(modal, /<CharacterPortrait src=\{av\.id\}/);
  assert.ok(modal.includes('aria-pressed={selectedAvatar === av.id}'));
  assert.ok(modal.includes('type="button"'));
  assert.ok(modal.includes("rpc('alterar_avatar_jogador'"));
});

test('shared fallback is visible in oversized portraits without stretching source art', () => {
  const portrait = read('src/components/CharacterPortrait.jsx');
  const style = read('src/styles/character-portraits.css');
  assert.ok(portrait.includes("import '../styles/character-portraits.css'"));
  assert.ok(portrait.includes('onError={() => setFailedIndex(index => index + 1)}'));
  assert.ok(portrait.includes('https:'));
  assert.ok(style.includes('.kuro-hero__portrait'));
  assert.ok(style.includes('.combat-portrait-wrap'));
  assert.ok(style.includes('object-fit: contain'));
  assert.ok(style.includes('prefers-reduced-motion'));
});
