import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateItemReplacementPlan } from '../src/utils/itemReplacementPlan.js';

const fixture=()=>({
  items:[
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
  inventory:[
    {item_id:1,is_equipped:false},{item_id:1,is_equipped:false},
    {item_id:2,is_equipped:true},
    {item_id:4,is_equipped:false},
    {item_id:5,is_equipped:true},{item_id:5,is_equipped:false},
    {item_id:9,is_equipped:true},{item_id:9,is_equipped:false},
  ],
  consumables:[{id:1},{id:2},{id:3},{id:4},{id:5},{id:6}],
  consumable_inventory:[{consumable_id:1},{consumable_id:3}],
});

const approvedTarget=(key,type='Cabeça')=>({
  key,name:'Item Original Kurokage '+key,type,rarity:'Comum',
  req_level:1,price:50,bonus_stats:{},approvedImage:null,
});
const clearedGates={
  verifiedDatabaseBackup:true,rollbackVerified:true,
  authenticatedGameplayVerified:true,lootSelectionReplaced:true,
  bossRewardLogicReplaced:true,
};

test('no replacements is a no-op, without executable SQL or destructive approval',()=>{
  const data=fixture(),prior=JSON.stringify(data);
  const plan=evaluateItemReplacementPlan(data,{});
  assert.equal(plan.mode,'DRY_RUN_ONLY');
  assert.equal(plan.executable,false);
  assert.equal(plan.accepted,true);
  assert.deepEqual(plan.blockers,[]);
  assert.equal(plan.counts.sourceItems,13);
  assert.equal(plan.counts.plannedRetirements,0);
  assert.equal(plan.counts.preservedCatalogRows,13);
  assert.equal(JSON.stringify(data),prior);
  assert.equal(Object.hasOwn(plan,'sql'),false);
});

test('cannot delete item in use without mapping, backup, loot and gameplay',()=>{
  const plan=evaluateItemReplacementPlan(fixture(),{retireItemIds:[2]});
  assert.equal(plan.executable,false);
  assert.equal(plan.counts.plannedRetirements,1);
  assert.equal(plan.retiredRows[0].ownedCopies,1);
  assert.equal(plan.retiredRows[0].equippedCopies,1);
  for(const code of ['OWNED_ITEM_UNMAPPED','GLOBAL_LOOT_DEPENDENCY','BACKUP_UNVERIFIED','ROLLBACK_UNVERIFIED','GAMEPLAY_UNVERIFIED']){
    assert.ok(plan.blockers.some(x=>x.code===code),code);
  }
});

test('slot-compatible original replacement passes preflight but never executes',()=>{
  const data=fixture();
  const opts={...clearedGates,retireItemIds:[2,5],mappings:[
    {sourceItemId:2,targetKey:'bandana-v4'},
    {sourceItemId:5,targetKey:'bracelet-v4'},
  ],targetCatalog:[approvedTarget('bandana-v4'),approvedTarget('bracelet-v4','Braços')]};
  const plan=evaluateItemReplacementPlan(data,opts);
  assert.equal(plan.accepted,true);
  assert.equal(plan.executable,false);
  assert.equal(plan.counts.plannedRetirements,2);
  assert.equal(plan.counts.copiedInventoryRows,3);
  assert.equal(plan.counts.copiedEquippedRows,2);
  assert.equal(plan.counts.preservedCatalogRows,11);
  assert.deepEqual(plan.retiredRows.map(x=>x.targetKey),['bandana-v4','bracelet-v4']);
  assert.ok(plan.retiredRows[0].preservedInventoryFields.includes('rolled_stats'));
  assert.ok(plan.retiredRows[0].preservedInventoryFields.includes('upgrade_level'));
});

test('cannot transform wearable into a Kunai, even with every gate ticked',()=>{
  const plan=evaluateItemReplacementPlan(fixture(),{
    ...clearedGates,retireItemIds:[2],
    mappings:[{sourceItemId:2,targetKey:'kunai'}],
    targetCatalog:[approvedTarget('kunai','Arma')],
  });
  assert.equal(plan.accepted,false);
  assert.ok(plan.blockers.some(x=>x.code==='INCOMPATIBLE_EQUIPMENT_SLOT'));
});

test('boss reward chests are protected until reward logic is replaced',()=>{
  const props={...clearedGates,bossRewardLogicReplaced:false,retireItemIds:[11,12,13]};
  const plan=evaluateItemReplacementPlan(fixture(),props);
  assert.equal(plan.accepted,false);
  assert.equal(plan.counts.plannedRetirements,3);
  assert.equal(plan.blockers.filter(x=>x.code==='BOSS_REWARD_DEPENDENCY').length,3);
  assert.equal(plan.retiredRows.filter(x=>x.bossRewardDependency).length,3);
});

test('invalid plans fail: duplicate mappings, unknown IDs, target names and unlicensed art',()=>{
  const plan=evaluateItemReplacementPlan(fixture(),{
    ...clearedGates,retireItemIds:[2,2,42],
    mappings:[
      {sourceItemId:2,targetKey:'one'},
      {sourceItemId:2,targetKey:'one'},
      {sourceItemId:9,targetKey:'one'},
    ],
    targetCatalog:[
      {...approvedTarget('one'),approvedImage:'/images/item-art/stolen.png',licensingVerified:false},
      {...approvedTarget('two'),name:'Item Original Kurokage one'},
      {key:'incomplete',name:'incomplete',type:'Cabeça'},
    ],
  });
  for(const code of [
    'UNKNOWN_RETIRED_ITEM','DUPLICATE_RETIREMENT','DUPLICATE_MAPPING_SOURCE',
    'MAPPING_WITHOUT_RETIREMENT','MERGED_ITEM_IDENTITIES','UNLICENSED_TARGET_IMAGE',
    'DUPLICATE_TARGET','TARGET_SPEC_INCOMPLETE',
  ]) assert.ok(plan.blockers.some(x=>x.code===code),code);
  assert.equal(plan.executable,false);
});

test('missing catalog targets and invalid snapshot foreign keys stop simulation',()=>{
  const data=fixture();data.inventory.push({item_id:999,is_equipped:true});
  const p=evaluateItemReplacementPlan(data,{
    retireItemIds:[2],mappings:[{sourceItemId:2,targetKey:'not-listed'}],
  });
  assert.ok(p.blockers.some(x=>x.code==='SNAPSHOT_INTEGRITY'));
  assert.ok(p.blockers.some(x=>x.code==='UNKNOWN_MAPPING_TARGET'));
  assert.ok(p.blockers.some(x=>x.code==='OWNED_ITEM_UNMAPPED'));
});

test('rejects incomplete target economy schema, even if item slot matches',()=>{
  const plan=evaluateItemReplacementPlan(fixture(),{
    retireItemIds:[2],mappings:[{sourceItemId:2,targetKey:'bandana'}],
    targetCatalog:[{key:'bandana',name:'Bandana Alternativa',type:'Cabeça'}],
  });
  assert.ok(plan.blockers.some(x=>x.code==='TARGET_SPEC_INCOMPLETE'));
  assert.equal(plan.executable,false);
});
