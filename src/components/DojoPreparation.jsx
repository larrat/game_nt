import { Link } from 'react-router-dom';
import { getDojoPreparation } from '../utils/dojoPreparation';

const format = value => value.toLocaleString('pt-BR');
const messages = {
  unknown: 'Alguns recursos ainda não estão disponíveis. Confira o status antes de lutar.',
  depleted: 'Há um recurso esgotado. Confira sua recuperação antes do próximo duelo.',
  recover: 'Você pode recuperar recursos antes do próximo duelo.',
  full: 'Vida, chakra e stamina estão completos na projeção atual.'
};

export default function DojoPreparation({ player }) {
  const preparation = getDojoPreparation(player);
  return (
    <section className="card mb-6" aria-labelledby="dojo-preparation-title">
      <h2 id="dojo-preparation-title" className="section-title">Preparação para o duelo</h2>
      <p className="text-muted mb-4" role="status">{messages[preparation.state]}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {preparation.resources.map(resource => (
          <div key={resource.key} className="flex flex-col gap-2">
            <span className="text-paper">{resource.label}</span>
            {resource.current === null ? <strong>Não disponível</strong> : <>
              <strong>{format(resource.current)} / {format(resource.max)}</strong>
              <progress className="w-full accent-gold" value={resource.current} max={resource.max}
                aria-label={resource.label + ' antes do duelo'}
                aria-valuetext={format(resource.current) + ' de ' + format(resource.max)} />
              <small className="text-muted">{resource.missing > 0
                ? 'Faltam ' + format(resource.missing) + ' para completar' : 'Completo'}</small>
            </>}
          </div>
        ))}
      </div>
      <p className="text-muted mt-4">{preparation.techniqueCount} técnicas carregadas no arsenal. Revise custos e aprimoramentos antes de entrar na arena.</p>
      <nav className="flex flex-wrap gap-3 mt-4" aria-label="Preparação do personagem">
        <Link className="btn-ghost" to="/status">Revisar atributos</Link>
        <Link className="btn-ghost" to="/tecnicas">Revisar técnicas</Link>
        <Link className="btn-ghost" to="/aprimorar-jutsus">Aprimorar jutsus</Link>
        <Link className="btn-primary" to="/ichiraku">Recuperar no Ichiraku</Link>
      </nav>
      <p className="text-muted text-sm mt-3">Máximos projetados com os atributos atuais. Os valores e o acesso ao duelo são confirmados ao iniciar o combate.</p>
    </section>
  );
}
