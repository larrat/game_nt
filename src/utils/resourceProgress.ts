import type { ResourceProgress } from '../types/character';

// A UI nunca recebe NaN, valores negativos ou percentuais acima de 100.
// A autoridade para os status máximos e recursos permanece no servidor/motor.
export function getResourceProgress(currentInput: unknown, maxInput: unknown): ResourceProgress {
  const rawMax = Number(maxInput);
  const max = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 1;
  const rawCurrent = Number(currentInput);
  const current = Number.isFinite(rawCurrent)
    ? Math.max(0, Math.min(rawCurrent, max))
    : 0;
  return {
    current,
    max,
    percent: Math.max(0, Math.min(100, (current / max) * 100))
  };
}
