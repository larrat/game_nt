/**
 * Representa a situação de alta, não o valor de HP exibido na barra.
 * Apenas o servidor pode limpar is_fainted ou cobrar ryous pela alta.
 */
export function getHospitalViewState(player, now = Date.now(), recoveryMs = 300000) {
  if (!player?.is_fainted) return { status: 'healthy', remainingSeconds: 0 };

  const faintedAt = typeof player.fainted_at === 'string'
    ? Date.parse(player.fainted_at)
    : NaN;
  if (!Number.isFinite(faintedAt)) {
    return { status: 'needs_sync', remainingSeconds: 0 };
  }

  const remainingSeconds = Math.max(0, Math.ceil((faintedAt + recoveryMs - now) / 1000));
  return {
    status: remainingSeconds > 0 ? 'recovering' : 'ready_for_discharge',
    remainingSeconds
  };
}
