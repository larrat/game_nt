// Pure helpers that mirror the current server-side treinar_atributos RPC.
// This module intentionally does not define a new points economy.
export const getTrainingBudget = (availablePoints, requestedQuantity = 1) => {
  const points = Math.max(0, Math.trunc(Number(availablePoints) || 0));
  const maxPerAction = Math.min(5, points);
  const quantity = maxPerAction === 0
    ? 0
    : Math.min(maxPerAction, Math.max(1, Math.trunc(Number(requestedQuantity) || 1)));
  return { points, maxPerAction, quantity, remaining: points - quantity };
};

export const getTrainingRange = (attribute, rank) => {
  const minBase = Math.max(1, Math.floor(Number(attribute?.hero_min ?? 1) * Number(rank?.train_min_mult ?? 0.2)));
  const maxBase = Math.max(minBase, Math.floor(Number(attribute?.hero_max ?? 1) * Number(rank?.train_max_mult ?? 0.3)));
  const bonus = Number(rank?.train_bonus ?? 1);
  return { min: minBase + bonus, max: maxBase + bonus, bonus };
};

export const formatTrainingReceipt = (result, label) => {
  if (!result || result.success !== true) return null;
  const gained = Number(result.gained);
  const quantity = Number(result.quantity);
  if (!Number.isFinite(gained) || !Number.isInteger(quantity) || quantity < 1) return null;
  return `+${gained.toLocaleString('pt-BR')} em ${label}, com ${quantity} ponto(s) utilizado(s).`;
};
