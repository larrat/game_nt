import React from 'react';
import { Link } from 'react-router-dom';
import SidebarIcon from './SidebarIcon';

const number = new Intl.NumberFormat('pt-BR');
const icons = { hp: 'heart', chakra: 'sparkles', stamina: 'zap' };
const messages = {
  unknown: 'Alguns recursos ainda não estão disponíveis. Confira seu status antes de lutar.',
  depleted: 'Há um recurso esgotado. Confira sua recuperação antes do próximo duelo.',
  recover: 'Você pode recuperar recursos antes do próximo duelo.',
  full: 'Vida, chakra e stamina estão completos na projeção atual.'
};

export default function DojoPreparation({ preparation }) {
  return (
    <section className="kuro-dojo-v4__preparation" aria-labelledby="dojo-preparation-title">
      <div className="kuro-dojo-v4__section-heading">
        <div>
          <span className="kuro-dojo-v4__eyebrow">RECURSOS DO NINJA</span>
          <h2 id="dojo-preparation-title">Preparação para o duelo</h2>
        </div>
        <p role="status">{messages[preparation.state]}</p>
      </div>
      <div className="kuro-dojo-v4__resources">
        {preparation.resources.map(({ key, label, current, max, missing }) => (
          <div key={key} className="kuro-dojo-v4__metric">
            <span><SidebarIcon name={icons[key]} size={15} /> {label}</span>
            {current === null ? (
              <strong>Não disponível</strong>
            ) : (
              <>
                <strong>{number.format(current)} / {number.format(max)}</strong>
                <progress className="kuro-dojo-v4__resource-bar" value={current} max={max}
                  aria-label={label + ' antes do duelo'}
                  aria-valuetext={number.format(current) + ' de ' + number.format(max)} />
                <small>{missing > 0 ? 'Faltam ' + number.format(missing) + ' para completar' : 'Completo'}</small>
              </>
            )}
          </div>
        ))}
      </div>
      <nav className="kuro-dojo-v4__preparation-actions" aria-label="Preparação do personagem">
        <Link className="kui-action kui-action--quiet" to="/status">Revisar atributos</Link>
        <Link className="kui-action kui-action--quiet" to="/tecnicas">Revisar técnicas</Link>
        <Link className="kui-action kui-action--quiet" to="/aprimorar-jutsus">Aprimorar jutsus</Link>
        <Link className="kui-action kui-action--seal" to="/ichiraku">Recuperar no Ichiraku</Link>
      </nav>
      <p className="kuro-dojo-v4__preparation-caption">
        Máximos projetados pelos atributos atuais. O servidor confirma o acesso e os valores ao iniciar o combate.
      </p>
    </section>
  );
}
