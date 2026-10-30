// Mesma regra de proteção contra consumo acidental aplicada pela RPC do ferreiro.
// Este cálculo é apenas uma prévia; o servidor bloqueia e revalida todos os itens.
export const getRefinableItems = (inventory) => {
  const rows = Array.isArray(inventory) ? inventory : [];
  return rows.filter(target => {
    if (!target?.items || Number(target.upgrade_level ?? 0) >= 10) return false;
    return rows.some(material =>
      material.id !== target.id &&
      material.item_id === target.item_id &&
      !material.is_equipped &&
      !material.is_favorite
    );
  });
};
