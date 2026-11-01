import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildItemMigrationPreflight } from '../src/utils/itemMigrationPreflight.js';

const fixture = () => ({
  items: [
    {id:1,name:'Bandana Simples',type:'Cabeça'},
    {id:2,name:'Bandana Fortificada',type:'Cabeça'},
    {id:3,name:'Colete Chunin',type:'Tronco'},
    {id:4,name:'Colete Jounin',type:'Tronco'},
    {id:5,name:'Protetor de Pulso',type:'Braços'},
    {id:6,name:'Botas Ninja Padrão',type:'Pernas'},
    {id:7,name:'Kunai de Aço',type:'Arma'},
    {id:8,name:'Shuriken Gigante',type:'Arma'},
    {id:9,name:'Kubikiribōchō (Espada Zabuza)',type:'Arma'},
    {id:10,name:'Colar do Primeiro Hokage',type:'Acessório'},
    {id:11,name:'Baú de Incursão (Bronze)',type:'Consumível'},
    {id:12,name:'Baú de Incursão (Prata)',type:'Consumível'},
    {id:13,name:'Baú de Incursão (Ouro)',type:'Consumível'},
  ],
  inventory: [
    {item_id:1,is_equipped:false,is_favorite:false},
    {item_id:1,is_equipped:false,is_favorite:false},
    {item_id:2,is_equipped:true,is_favorite:false},
    {item_id:4,is_equipped:false,is_favorite:false},
    {item_id:5,is_equipped:true,is_favorite:false},
    {item_id:5,is_equipped:false,is_favorite:false},
    {item_id:9,is_equipped:true,is_favorite:false},
    {item_id:9,is_equipped:false,is_favorite:false},
  ],
  consumables: Array.from({length:6},(_,index)=>({id:index+1,name:'Consumível '+(index+1)})),
  consumable_inventory:[{consumable_id:1},{consumable_id:3}],
});

test('dry-run reproduces observed 13-item homologation counts without authorizing deletion', () => {
  const report = buildItemMigrationPreflight(fixture());
  assert.equal(report.schemaVersion,1);
  assert.equal(report.mode,'DRY_RUN_READ_ONLY');
  assert.equal(report.approvedForDeletion,false);
  assert.deepEqual(report.integrityErrors,[]);
  assert.deepEqual(report.counts,{
    items:13,
    inventoryRows:8,
    equippedRows:3,
    favoriteRows:0,
    consumables:6,
    consumableInventoryRows:2,
    referenceNames:73,
    exactNameMatches:1,
    blockedInventory:5,
    blockedBossReward:3,
    reviewUnusedLegacy:4,
  });
  assert.ok(Object.values(report.gates).every(v=>v===false));
  assert.ok(report.classification.every(row=>row.safeToDeleteNow===false));
  assert.deepEqual(report.classification.filter(row=>row.exactReference).map(row=>row.name),['Shuriken Gigante']);
  const equipped = report.classification.filter(row=>row.equippedRows>0);
  assert.deepEqual(equipped.map(row=>row.id),[2,5,9]);
  for(const id of [11,12,13]){
    const item=report.classification.find(x=>x.id===id);
    assert.equal(item.status,'BLOCKED_BOSS_REWARD');
    assert.equal(item.rewardDependency,true);
  }
});

test('favorite item and owned equipment stay blocked even if name matches documentation',()=>{
  const input=fixture();
  input.inventory.push({item_id:8,is_equipped:false,is_favorite:true});
  const report=buildItemMigrationPreflight(input);
  const item=report.classification.find(x=>x.id===8);
  assert.equal(item.status,'BLOCKED_INVENTORY_REFERENCES');
  assert.equal(item.favoriteRows,1);
  assert.equal(item.exactReference,true);
  assert.equal(report.counts.favoriteRows,1);
  assert.equal(item.safeToDeleteNow,false);
});

test('broken references, duplicate IDs, and duplicate names are rejected',()=>{
  const input=fixture();
  input.inventory.push({item_id:999,is_equipped:false,is_favorite:false});
  input.consumable_inventory.push({consumable_id:888});
  input.items.push({id:1,name:'Shuriken Gigante'});
  input.items.push({id:14,name:' SHURIKEN   GIGANTE '});
  const report=buildItemMigrationPreflight(input);
  assert.ok(report.integrityErrors.some(x=>x.includes('missing item ID: 999')));
  assert.ok(report.integrityErrors.some(x=>x.includes('missing consumable ID: 888')));
  assert.ok(report.integrityErrors.some(x=>x.includes('duplicated item ID: 1')));
  assert.ok(report.integrityErrors.some(x=>x.includes('Duplicate catalog item name')));
  assert.equal(report.approvedForDeletion,false);
});

test('immutable classification and strict input shape',()=>{
  const input=fixture();
  const prior=JSON.stringify(input);
  const report=buildItemMigrationPreflight(input);
  assert.equal(JSON.stringify(input),prior);
  assert.throws(()=>buildItemMigrationPreflight(null),/snapshot must be an object/);
  assert.throws(()=>buildItemMigrationPreflight({items:{},inventory:[]}),/items must be an array/);
  assert.throws(()=>buildItemMigrationPreflight({items:[],inventory:null}),/inventory must be an array/);
  assert.ok(buildItemMigrationPreflight({items:[],inventory:[]},['Kunai',' kunai ']).integrityErrors.some(x=>x.includes('duplicated')));
  assert.ok(report.classification.length===13);
});

test('snapshot export contains only read-only SQL with no player identity columns',()=>{
  const sql=readFileSync(new URL('../scripts/export_item_migration_preflight.sql',import.meta.url),'utf8');
  const statements=sql.split('\n').filter(x=>!x.trim().startsWith('--')).join('\n');
  assert.match(statements,/BEGIN READ ONLY;/i);
  assert.match(statements,/COMMIT;/i);
  assert.doesNotMatch(statements,/\b(?:DELETE\s+FROM|TRUNCATE|DROP\s+TABLE|UPDATE\s+|INSERT\s+INTO|ALTER\s+TABLE|CREATE\s+TABLE)\b/i);
  assert.doesNotMatch(statements,/\b(?:user_id|player_id|email|password|auth_token)\b/i);
  assert.match(statements,/public\.player_inventory/);
  assert.match(statements,/public\.player_consumables/);
});
