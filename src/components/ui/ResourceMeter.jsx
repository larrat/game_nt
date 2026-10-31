import React from 'react';
import { getResourceProgress } from '../../utils/resourceProgress';

/**
 * Medidor nativo: valores vêm do estado real e são tratados pelo utilitário
 * comum. As barras são apenas representação, nunca fonte de verdade.
 */
export default function ResourceMeter({ label, current, max, tone = 'hp', symbol = '◆', className = '' }) {
  const progress = getResourceProgress(current, max);
  const formatted = (value) => value.toLocaleString('pt-BR');
  const supportedTone = ['hp', 'chakra', 'stamina', 'xp'].includes(tone) ? tone : 'hp';

  return (
    <div className={['kui-resource', 'kui-resource--' + supportedTone, className].filter(Boolean).join(' ')}>
      <div className="kui-resource__meta">
        <span className="kui-resource__symbol" aria-hidden="true">{symbol}</span>
        <span className="kui-resource__name">{label}</span>
        <strong className="kui-resource__amount">{formatted(progress.current)} <span>/ {formatted(progress.max)}</span></strong>
      </div>
      <progress
        className={'kui-resource__track kui-resource__track--' + supportedTone}
        value={progress.current}
        max={progress.max}
        aria-label={label}
        aria-valuetext={formatted(progress.current) + ' de ' + formatted(progress.max)}
      />
    </div>
  );
}
