import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DOCUMENTED_ITEM_VISUALS } from '../src/data/documentedItemVisuals.js';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
test('homologation item audit is read-only and includes every documented reference name', () => {
  const sql = read('scripts/audit_homologation_items_v4.sql');
  const md = read('docs/audits/ITEMS-HOMOLOGATION-RECONCILIATION-2026-10-31.md');
  assert.equal(DOCUMENTED_ITEM_VISUALS.length, 73);
  assert.match(sql, /BEGIN READ ONLY;/i);
  assert.match(sql, /COMMIT;/i);
  for (const {name} of DOCUMENTED_ITEM_VISUALS) {
    assert.ok(sql.includes("('"+name.replaceAll("'","''")+"')"), 'Missing documented item in SQL: '+name);
  }
  const executable = sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
  assert.doesNotMatch(executable, /\b(?:DELETE\s+FROM|TRUNCATE|DROP\s+TABLE|UPDATE\s+|INSERT\s+INTO|ALTER\s+TABLE|CREATE\s+TABLE)\b/i);
  for (const name of ['Shuriken Gigante','Bandana Fortificada','Protetor de Pulso','Kubikiribōchō (Espada Zabuza)','Baú de Incursão (Ouro)']) {
    assert.ok(md.includes(name), 'Missing current item description: '+name);
  }
  assert.ok(md.includes('kurokage_roll_loot'));
  assert.ok(md.includes('distribute_boss_rewards'));
  assert.ok(md.includes('8'));
  assert.ok(md.includes('3'));
});
