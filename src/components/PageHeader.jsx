import React from 'react';

// Cabeçalho reutilizável de telas: prioriza título, contexto e ação.
// Usa apenas classes, permitindo que todo o RPG mude de tema sem tocar no JSX.
export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="kuro-rpg-pagehead">
      <div className="kuro-rpg-pagehead__content">
        {eyebrow && <p className="kuro-rpg-pagehead__eyebrow"><span aria-hidden="true" />{eyebrow}</p>}
        <h1 className="kuro-rpg-pagehead__title">{title}</h1>
        {subtitle && <p className="kuro-rpg-pagehead__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="kuro-rpg-pagehead__actions">{actions}</div>}
    </header>
  );
}
