import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const style = read('src/styles/world-services-v4.css');
const cases = [
  ['Historia', 'kuro-story-v4', ["rpc('concluir_story_quest'", "getNpcPortrait"]],
  ['Hospital', 'kuro-hospital-v4', ["rpc('hospital_alta'", 'globalDebuffs.hospitalCostMultiplier']],
  ['Ichiraku', 'kuro-ichiraku-v4', ["rpc('comprar_ramen'", "rpc('usar_consumivel_inventario'"]],
];
test('story and services use the shared design system while preserving RPC authority', () => {
  for (const [page, root, identifiers] of cases) {
    const text = read('src/pages/' + page + '.jsx');
    assert.ok(text.includes("import '../styles/world-services-v4.css'"), page + ' shared CSS');
    assert.ok(text.includes(root), page + ' scoped root');
    assert.ok(text.includes("import SidebarIcon from '../components/SidebarIcon'"), page + ' shared icons');
    assert.ok(text.includes("import GameAction from '../components/ui/GameAction'"), page + ' shared actions');
    identifiers.forEach(term => assert.ok(text.includes(term), page + ' preserved ' + term));
  }
  assert.ok(style.includes('var(--kuro-line)'));
  assert.ok(style.includes('@media(max-width:760px)'));
});
test('story dialogue, hospital payment, and food tabs retain semantic states', () => {
  const story = read('src/pages/Historia.jsx');
  const hospital = read('src/pages/Hospital.jsx');
  const ichiraku = read('src/pages/Ichiraku.jsx');
  assert.ok(story.includes('aria-modal="true"'));
  assert.ok(story.includes('kuro-story-empty kuro-ui-card'));
  assert.ok(hospital.includes('loading={loading}'));
  assert.ok(hospital.includes('disabled={player.ryous < cureCost}'));
  assert.ok(ichiraku.includes('role="tablist"'));
  assert.equal((ichiraku.match(/role="tab"/g)||[]).length,2);
  assert.ok(ichiraku.includes("aria-selected={tab === 'loja'}"));
  assert.ok(ichiraku.includes("aria-selected={tab === 'mochila'}"));
  assert.ok(ichiraku.includes('kuro-ichiraku-v4__item'));
});
