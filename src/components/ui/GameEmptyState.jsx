import React from 'react';

/** Vazio informativo: orienta o jogador sem simular dados ou recompensas. */
export default function GameEmptyState({ title, description, icon = '◌', action, className = '' }) {
  return (
    <div className={['kui-empty', className].filter(Boolean).join(' ')} role="status">
      <span className="kui-empty__icon" aria-hidden="true">{icon}</span>
      <div className="kui-empty__body">
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="kui-empty__action">{action}</div>}
    </div>
  );
}
