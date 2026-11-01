import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DOCUMENTED_ITEM_VISUALS, normalizeItemVisualName, resolveDocumentedItemVisual } from '../src/data/documentedItemVisuals.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('documented item registry covers the actual Ninja Shop evidence without importing rules', () => {
  const observation = read('docs/reverse-engineering/coleta-2026-10-30/naruto-capturas/ninja_shop.txt');
  const matches = [...observation.matchAll(/- generic: x0\s*\n- generic: ([^\n]+)/g)].map(x => x[1].trim());
  assert.equal(DOCUMENTED_ITEM_VISUALS.length, 73);
  const all = DOCUMENTED_ITEM_VISUALS.map(x => normalizeItemVisualName(x.name));
  assert.equal(new Set(all).size, 73);
  for (const item of DOCUMENTED_ITEM_VISUALS) {
    assert.ok(matches.includes(item.name), 'No source evidence for ' + item.name);
    assert.equal(item.approvedImage, null, 'No unlicensed third-party artwork must be published');
    assert.ok(['swords','target','flame','scroll','shield','sparkles','package'].includes(item.icon));
    assert.ok(!('price' in item), 'Shop reference prices must not override game economy');
  }
  assert.equal(resolveDocumentedItemVisual(' KUNAI ').name, 'Kunai');
  assert.equal(resolveDocumentedItemVisual('lançador de senbons').name, 'Lançador de Senbons');
  assert.equal(resolveDocumentedItemVisual('item antigo').icon, 'package');
});

test('existing inventory items gain visual artwork with offline fallback and unchanged RPCs', () => {
  const itemView = read('src/components/ItemArtwork.jsx');
  const inventory = read('src/pages/Equipamentos.jsx');
  const icons = read('src/components/SidebarIcon.jsx');
  assert.ok(itemView.includes('resolveDocumentedItemVisual'));
  assert.ok(itemView.includes("name={visual.icon}"));
  assert.ok(itemView.includes('/images\\/item-art'));
  assert.ok(!itemView.includes('narutogame.com.br'));
  assert.ok(inventory.includes('<ItemArtwork name={equipped.items.name}'));
  assert.ok(inventory.includes('<ItemArtwork name={invItem.items.name}'));
  assert.ok(inventory.includes("rpc('alterar_equipamento_inventario'"));
  assert.ok(inventory.includes("rpc('vender_itens_inventario'"));
  assert.ok(icons.includes('package: Package'));
});

test('combat, map and missions keep authoritative actions while adopting v4 components', () => {
  const combat = read('src/pages/Combate.jsx');
  const map = read('src/pages/Mapa.jsx');
  const missions = read('src/pages/Tarefas.jsx');
  const css = read('src/styles/core-flows-v4.css');
  for (const source of [combat, map, missions, read('src/pages/Equipamentos.jsx')]) {
    assert.ok(source.includes("core-flows-v4.css"), 'all core screens use the same stylesheet');
  }
  assert.ok(combat.includes('iniciar_combate_sessao'));
  assert.ok(combat.includes('finalizar_combate_sessao'));
  assert.ok(combat.includes('kuro-combat-v4'));
  assert.ok(map.includes("rpc('viajar_mapa'"));
  assert.ok(map.includes('kuro-map-v4--village'));
  assert.ok(map.includes('kuro-map-v4--world'));
  assert.ok(map.includes("const TileElement = building ? 'button' : 'div'"));
  assert.ok(missions.includes("rpc('iniciar_missao'"));
  assert.ok(missions.includes("rpc('finalizar_missao'"));
  assert.ok(css.includes('.kuro-item-artwork'));
  assert.ok(css.includes('focus-visible'));
});
