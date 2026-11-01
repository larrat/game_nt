import { DOCUMENTED_ITEM_VISUALS } from '../data/documentedItemVisuals.js';

/**
 * Pure, side-effect-free preflight for Kurokage item catalog migration.
 * It deliberately NEVER returns an executable DELETE/UPDATE/INSERT script.
 * Names from external documentation are visual references only.
 */
const BOSS_REWARD_NAMES = Object.freeze([
  'Baú de Incursão (Bronze)',
  'Baú de Incursão (Prata)',
  'Baú de Incursão (Ouro)',
]);

const normalized = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
const positiveId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const defaultArray = (value, label) => {
  if (!Array.isArray(value)) throw new TypeError(label + ' must be an array');
  return value;
};

export function buildItemMigrationPreflight(snapshot, documentedNames = DOCUMENTED_ITEM_VISUALS.map(entry => entry.name)) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new TypeError('snapshot must be an object');
  const items = defaultArray(snapshot.items, 'items');
  const inventory = defaultArray(snapshot.inventory, 'inventory');
  const consumables = defaultArray(snapshot.consumables ?? [], 'consumables');
  const consumableInventory = defaultArray(snapshot.consumable_inventory ?? [], 'consumable_inventory');
  const references = defaultArray(documentedNames, 'documentedNames');
  const documented = new Set(references.map(normalized));
  const bossRewards = new Set(BOSS_REWARD_NAMES.map(normalized));
  const catalogIds = new Set();
  const consumableIds = new Set();
  const integrityErrors = [];

  if (documented.size !== references.length || documented.has('')) integrityErrors.push('Documented reference names are empty or duplicated.');
  for (const item of items) {
    const id = Number(item?.id);
    if (!positiveId(id) || catalogIds.has(id)) integrityErrors.push('Invalid or duplicated item ID: ' + String(item?.id));
    if (!String(item?.name || '').trim()) integrityErrors.push('Missing item name for ID ' + String(item?.id));
    catalogIds.add(id);
  }

  const inventoryByItem = new Map();
  for (const row of inventory) {
    const id = Number(row?.item_id);
    if (!positiveId(id) || !catalogIds.has(id)) integrityErrors.push('Inventory references a missing item ID: ' + String(row?.item_id));
    const counts = inventoryByItem.get(id) ?? { total: 0, equipped: 0, favorite: 0 };
    counts.total += 1;
    counts.equipped += row?.is_equipped === true ? 1 : 0;
    counts.favorite += row?.is_favorite === true ? 1 : 0;
    inventoryByItem.set(id, counts);
  }

  for (const consumable of consumables) {
    const id = Number(consumable?.id);
    if (!positiveId(id) || consumableIds.has(id)) integrityErrors.push('Invalid or duplicated consumable ID: ' + String(consumable?.id));
    consumableIds.add(id);
  }
  for (const row of consumableInventory) {
    if (!consumableIds.has(Number(row?.consumable_id))) integrityErrors.push('Consumable inventory references a missing consumable ID: ' + String(row?.consumable_id));
  }

  const nameCount = new Map();
  for (const item of items) {
    const name = normalized(item.name);
    nameCount.set(name, (nameCount.get(name) ?? 0) + 1);
  }
  for (const [name, count] of nameCount) {
    if (name && count > 1) integrityErrors.push('Duplicate catalog item name: ' + name);
  }

  const classification = items.map(item => {
    const id = Number(item.id);
    const name = normalized(item.name);
    const counts = inventoryByItem.get(id) ?? { total: 0, equipped: 0, favorite: 0 };
    const exactReference = documented.has(name);
    const rewardDependency = bossRewards.has(name);
    let status, explanation;
    if (counts.total > 0) {
      status = 'BLOCKED_INVENTORY_REFERENCES';
      explanation = 'Inventory references must be remapped and verified before any removal.';
    } else if (rewardDependency) {
      status = 'BLOCKED_BOSS_REWARD';
      explanation = 'Server boss rewards resolve this item by its exact name.';
    } else if (exactReference) {
      status = 'REFERENCE_NAME_MATCH';
      explanation = 'Only the name matches external documentation; properties are not validated.';
    } else {
      status = 'REVIEW_UNUSED_LEGACY';
      explanation = 'No direct inventory references; still used by global loot selection until RPC is revised.';
    }
    return Object.freeze({
      id, name: item.name, type: item.type ?? null, status,
      exactReference, rewardDependency,
      inventoryRows: counts.total, equippedRows: counts.equipped, favoriteRows: counts.favorite,
      explanation, safeToDeleteNow: false,
    });
  });

  const counts = {
    items: items.length,
    inventoryRows: inventory.length,
    equippedRows: inventory.filter(row => row?.is_equipped === true).length,
    favoriteRows: inventory.filter(row => row?.is_favorite === true).length,
    consumables: consumables.length,
    consumableInventoryRows: consumableInventory.length,
    referenceNames: documented.size,
    exactNameMatches: classification.filter(row => row.exactReference).length,
    blockedInventory: classification.filter(row => row.status === 'BLOCKED_INVENTORY_REFERENCES').length,
    blockedBossReward: classification.filter(row => row.status === 'BLOCKED_BOSS_REWARD').length,
    reviewUnusedLegacy: classification.filter(row => row.status === 'REVIEW_UNUSED_LEGACY').length,
  };

  return {
    schemaVersion: 1,
    mode: 'DRY_RUN_READ_ONLY',
    approvedForDeletion: false,
    warning: 'No deletion can proceed without verified backup, owned target catalog, loot/RPC replacement, item ID remapping and rollback validation.',
    gates: {
      verifiedBackup: false,
      approvedOriginalCatalog: false,
      lootAndBossRewardsUpdated: false,
      inventoryMappingsVerified: false,
      rollbackTested: false,
      authenticatedGameplayTested: false,
    },
    counts,
    integrityErrors: [...new Set(integrityErrors)],
    classification,
  };
}
