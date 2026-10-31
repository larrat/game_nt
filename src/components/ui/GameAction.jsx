import React from 'react';

/**
 * Botão sem lógica de domínio: uma intenção visual consistente e um alvo
 * acessível para toque/teclado. Operações reais continuam nos handlers das páginas.
 */
export default function GameAction({
  children,
  tone = 'seal',
  size = 'default',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...rest
}) {
  const supportedTone = ['seal', 'gold', 'quiet'].includes(tone) ? tone : 'seal';
  return (
    <button
      type={type}
      className={['kui-action', 'kui-action--' + supportedTone, size === 'small' ? 'kui-action--small' : '', className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
