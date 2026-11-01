import { buildItemMigrationPreflight } from './itemMigrationPreflight.js';

/**
 * Compare proposed item catalog replacements without writing to Supabase.
 * This file never emits runnable SQL or claims a migration is authorized.
 * Target catalog entries are product decisions, not scraped game parameters.
 */
const keyOf = value => String(value ?? '').normalize('NFKC').trim();
const typeOf = value => keyOf(value).toLocaleLowerCase('pt-BR');
const integerId = value => Number.isSafeInteger(value) && value > 0;

const ORIGINAL_REQUIRED_FIELDS = Object.freeze([
  'key', 'name', 'type', 'rarity', 'req_level', 'price', 'bonus_stats',
]);

function isCompleteTarget(target) {
  if (!target || typeof target !== 'object' || Array.isArray(target)) return false;
  if (ORIGINAL_REQUIRED_FIELDS.some(field => !Object.hasOwn(target, field))) return false;
  if (!keyOf(target.key) || !keyOf(target.name) || !keyOf(target.type) || !keyOf(target.rarity)) return false;
  if (!Number.isSafeInteger(target.req_level) || target.req_level < 1) return false;
  if (!Number.isSafeInteger(target.price) || target.price < 0) return false;
  return target.bonus_stats !== null && typeof target.bonus_stats === 'object' && !Array.isArray(target.bonus_stats);
}

function addBlocking(blockers, code, detail) {
  blockers.push({ code, detail });
}

export function evaluateItemReplacementPlan(snapshot, proposal = {}) {
  const preflight = buildItemMigrationPreflight(snapshot);
  const items = snapshot.items;
  const retireIds = proposal.retireItemIds ?? [];
  const mappings = proposal.mappings ?? [];
  const targetCatalog = proposal.targetCatalog ?? [];
  if (!Array.isArray(retireIds) || !Array.isArray(mappings) || !Array.isArray(targetCatalog)) {
    throw new TypeError('retireItemIds, mappings and targetCatalog must be arrays');
  }

  const blockers = preflight.integrityErrors.map(detail => ({ code: 'SNAPSHOT_INTEGRITY', detail }));
  const sourceById = new Map(items.map(item => [Number(item.id), item]));
  const targetByKey = new Map();
  const targetNames = new Set();

  for (const target of targetCatalog) {
    if (!isCompleteTarget(target)) {
      addBlocking(blockers, 'TARGET_SPEC_INCOMPLETE', 'Proposed catalog items need original name, type, rarity, level, price, bonus_stats and stable key.');
      continue;
    }
    const key = keyOf(target.key), name = typeOf(target.name);
    if (targetByKey.has(key) || targetNames.has(name)) {
      addBlocking(blockers, 'DUPLICATE_TARGET', 'Target catalog key or name is duplicated: ' + key);
    }
    if (target.approvedImage && !target.licensingVerified) {
      addBlocking(blockers, 'UNLICENSED_TARGET_IMAGE', 'Proposed image has no verified provenance: ' + key);
    }
    targetByKey.set(key, target);
    targetNames.add(name);
  }

  const retired = new Set();
  for (const id of retireIds) {
    if (!integerId(id) || !sourceById.has(id)) {
      addBlocking(blockers, 'UNKNOWN_RETIRED_ITEM', 'Retirement references an invalid item ID: ' + String(id));
    }
    if (retired.has(id)) addBlocking(blockers, 'DUPLICATE_RETIREMENT', 'Repeated retirement item ID: ' + String(id));
    retired.add(id);
  }

  const mapped = new Map();
  const usedTargets = new Set();
  for (const row of mappings) {
    const sourceId = row?.sourceItemId, targetKey = keyOf(row?.targetKey);
    if (!integerId(sourceId) || !sourceById.has(sourceId)) {
      addBlocking(blockers, 'UNKNOWN_MAPPING_SOURCE', 'Invalid mapping source item ID: ' + String(sourceId));
      continue;
    }
    if (mapped.has(sourceId)) addBlocking(blockers, 'DUPLICATE_MAPPING_SOURCE', 'Source mapped more than once: ' + sourceId);
    if (!retired.has(sourceId)) addBlocking(blockers, 'MAPPING_WITHOUT_RETIREMENT', 'Mapping source not listed for retirement: ' + sourceId);
    const target = targetByKey.get(targetKey);
    if (!target) {
      addBlocking(blockers, 'UNKNOWN_MAPPING_TARGET', 'No complete target catalog entry for: ' + targetKey);
      continue;
    }
    if (usedTargets.has(targetKey)) addBlocking(blockers, 'MERGED_ITEM_IDENTITIES', 'Two legacy item IDs would collapse into one target: ' + targetKey);
    if (typeOf(sourceById.get(sourceId).type) !== typeOf(target.type)) {
      addBlocking(blockers, 'INCOMPATIBLE_EQUIPMENT_SLOT', 'Item ' + sourceId + ' type ' + sourceById.get(sourceId).type + ' cannot become ' + target.type);
    }
    mapped.set(sourceId, targetKey);
    usedTargets.add(targetKey);
  }

  const byId = new Map(preflight.classification.map(item => [item.id, item]));
  const retiredRows = [];
  for (const id of retired) {
    const src = byId.get(id);
    if (!src) continue; // UNKNOWN_RETIRED_ITEM already blocked.
    const targetKey = mapped.get(id) ?? null;
    if (src.inventoryRows > 0 && !targetKey) {
      addBlocking(blockers, 'OWNED_ITEM_UNMAPPED', 'Item ' + id + ' has ' + src.inventoryRows + ' owned copies; equipment/favorite flags must survive a mapped transition.');
    }
    if (src.rewardDependency && proposal.bossRewardLogicReplaced !== true) {
      addBlocking(blockers, 'BOSS_REWARD_DEPENDENCY', 'Boss reward SQL still looks up item ' + id + ' by name.');
    }
    if (proposal.lootSelectionReplaced !== true) {
      addBlocking(blockers, 'GLOBAL_LOOT_DEPENDENCY', 'kurokage_roll_loot currently selects from all items; retire item ' + id + ' only after loot logic is adjusted.');
    }
    retiredRows.push(Object.freeze({
      id, sourceName: src.name, sourceType: src.type, targetKey,
      ownedCopies: src.inventoryRows, equippedCopies: src.equippedRows,
      favoriteCopies: src.favoriteRows, bossRewardDependency: src.rewardDependency,
      preservedInventoryFields: ['is_equipped','is_favorite','rarity','rolled_stats','upgrade_level','is_server_acquired'],
    }));
  }
  if (retired.size > 0 && proposal.verifiedDatabaseBackup !== true) {
    addBlocking(blockers, 'BACKUP_UNVERIFIED', 'A restore-tested backup is mandatory before a real migration.');
  }
  if (retired.size > 0 && proposal.rollbackVerified !== true) {
    addBlocking(blockers, 'ROLLBACK_UNVERIFIED', 'The plan must be rehearsed and rolled back on the same schema.');
  }
  if (retired.size > 0 && proposal.authenticatedGameplayVerified !== true) {
    addBlocking(blockers, 'GAMEPLAY_UNVERIFIED', 'Combat, drops, equipment, shop and boss rewards must be smoke-tested.');
  }

  const unreferenced = preflight.classification
    .filter(item => !retired.has(item.id))
    .map(item => ({ id:item.id, name:item.name, ownedCopies:item.inventoryRows }));

  // No imperative data or SQL can be produced by this pure simulation.
  return {
    mode: 'DRY_RUN_ONLY',
    schemaVersion: 1,
    executable: false,
    accepted: blockers.length === 0,
    counts: {
      sourceItems: items.length,
      plannedRetirements: retiredRows.length,
      plannedMappings: mapped.size,
      copiedInventoryRows: retiredRows.reduce((sum,row)=>sum+row.ownedCopies,0),
      copiedEquippedRows: retiredRows.reduce((sum,row)=>sum+row.equippedCopies,0),
      copiedFavoriteRows: retiredRows.reduce((sum,row)=>sum+row.favoriteCopies,0),
      preservedCatalogRows: unreferenced.length,
    },
    blockers,
    retiredRows,
    preservedRows: unreferenced,
    warning: 'A preflight report is not authorization to write or delete data. Replace loot and reward RPCs before any retirements.',
  };
}
