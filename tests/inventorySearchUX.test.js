import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterConsumables, getConsumableUnits } from '../src/utils/inventorySearch.js';

const rows = [
  { id: 1, quantity: 3, consumables: { name: 'Rámen', description: 'Recupera vida' } },
  { id: 2, quantity: 2, consumables: { name: 'Pílula de Chakra', description: 'Restaura CP' } }
];

test('inventory search ignores accents and searches descriptions', () => {
  assert.deepEqual(filterConsumables(rows, 'ramen').map(x => x.id), [1]);
  assert.deepEqual(filterConsumables(rows, 'CHAKRA').map(x => x.id), [2]);
  assert.deepEqual(filterConsumables(rows, 'vida').map(x => x.id), [1]);
  assert.equal(filterConsumables(rows, 'não existe').length, 0);
});
test('inventory unit count is defensive and never mutates data', () => {
  assert.equal(getConsumableUnits(rows), 5);
  assert.equal(getConsumableUnits([{ quantity: -12 }, { quantity: '4' }]), 4);
  assert.equal(getConsumableUnits(null), 0);
  assert.equal(rows[0].quantity, 3);
});
test('inventory UI keeps server RPC consumption and portal, blocks concurrent clicks', () => {
  const src=readFileSync(new URL('../src/components/InventoryModal.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/styles/inventory-modal.css',import.meta.url),'utf8');
  assert.ok(src.includes('createPortal('));
  assert.ok(src.includes("rpc('usar_consumivel_inventario'"));
  assert.ok(src.includes('filterConsumables(items, search)'));
  assert.ok(src.includes('disabled={usingId !== null || inCombat}'));
  assert.ok(src.includes('if (!player || !updatePlayer || usingId !== null || consumingRef.current) return;'));
  assert.ok(src.includes('consumingRef.current = true;'));
  assert.ok(src.includes('consumingRef.current = false;'));
  assert.ok(src.includes('aria-busy={loading || usingId !== null}'));
  assert.ok(css.includes('@media (max-width: 390px)'));
  assert.ok(css.includes('focus-visible'));
});
