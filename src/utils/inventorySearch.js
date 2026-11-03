/** Search never changes ownership or consumption rules; only filters visible rows. */
export const normalizeInventorySearch = value => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

export function filterConsumables(items, term) {
  if (!Array.isArray(items)) return [];
  const normalized = normalizeInventorySearch(term);
  if (!normalized) return items;
  return items.filter(item => {
    const name = normalizeInventorySearch(item?.consumables?.name);
    const description = normalizeInventorySearch(item?.consumables?.description);
    return name.includes(normalized) || description.includes(normalized);
  });
}

export function getConsumableUnits(items) {
  return Array.isArray(items) ? items.reduce((sum, item) =>
    sum + Math.max(0, Number(item?.quantity) || 0), 0) : 0;
}
