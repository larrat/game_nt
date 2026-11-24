import { calculateHP, calculateChakra, calculateStamina } from './engine.js';

// This is only a projection. The combat session remains authoritative.
export function getDojoPreparation(player) {
  const resources = [
    ['hp', 'Vida', calculateHP],
    ['chakra', 'Chakra', calculateChakra],
    ['stamina', 'Stamina', calculateStamina]
  ].map(([key, label, calculate]) => {
    const projection = calculate(player || {});
    const max = Number.isFinite(projection) && projection > 0 ? projection : null;
    const raw = player?.[key];
    const value = typeof raw === 'number' || (typeof raw === 'string' && raw.trim())
      ? Number(raw) : NaN;
    const current = max !== null && Number.isFinite(value)
      ? Math.max(0, Math.min(value, max)) : null;
    return { key, label, max, current, missing: current === null ? null : max - current };
  });

  const state = resources.some(resource => resource.current === 0) ? 'depleted'
    : resources.some(resource => resource.current === null) ? 'unknown'
    : resources.some(resource => resource.missing > 0) ? 'recover' : 'full';

  return {
    resources,
    state,
    techniqueCount: Array.isArray(player?.activeJutsus) ? player.activeJutsus.length : null
  };
}
