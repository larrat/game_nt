import { calculateHP, calculateChakra, calculateStamina } from './engine.js';

// Projeção de preparação; o servidor continua autorizando o início do combate.
export function getDojoPreparation(player) {
  const resources = [
    ['hp', 'Vida', calculateHP],
    ['chakra', 'Chakra', calculateChakra],
    ['stamina', 'Stamina', calculateStamina]
  ].map(([key, label, calculate]) => {
    const maximum = Number(calculate(player || {}));
    const max = Number.isFinite(maximum) && maximum > 0 ? maximum : null;
    const raw = player?.[key];
    const value = raw == null || raw === '' ? NaN : Number(raw);
    const current = max !== null && Number.isFinite(value)
      ? Math.max(0, Math.min(value, max)) : null;
    return { key, label, max, current, missing: current === null ? null : max - current };
  });
  const known = resources.every(resource => resource.current !== null);
  const depleted = resources.some(resource => resource.current === 0);
  const needsRecovery = resources.some(resource => resource.missing > 0);
  return {
    resources,
    state: !known ? 'unknown' : depleted ? 'depleted' : needsRecovery ? 'recover' : 'full',
    techniqueCount: Array.isArray(player?.activeJutsus) ? player.activeJutsus.length : 0
  };
}
