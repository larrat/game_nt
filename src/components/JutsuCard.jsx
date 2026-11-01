import React from 'react';
import { getJutsuEligibility } from '../utils/jutsuEligibility';
import JutsuArtwork from './JutsuArtwork';

// The card and purchase handlers share the same pure, server-aligned eligibility check.
export default function JutsuCard({
  jutsu, player, isLearned = false, onLearn,
  showRequisites = true, loading = false
}) {
  const status = getJutsuEligibility(jutsu, player, isLearned);
  const level = Number(jutsu.req_level ?? jutsu.lvl ?? 1);
  const rank = jutsu.req_rank ?? jutsu.reqRank;
  const chakra = Number(jutsu.chakra_cost ?? jutsu.chakraCost ?? 0);
  const damage = Number(jutsu.damage ?? 0);
  const accuracy = Number(jutsu.accuracy ?? 0);
  const cooldown = Number(jutsu.cooldown ?? 0);
  const disabled = isLearned || !status.eligible || loading || typeof onLearn !== 'function';

  return (
    <article className={`card kuro-academy-v3__jutsu-card flex flex-col items-center text-center min-w-0 relative p-5 ${!status.eligible && !isLearned ? 'opacity-85' : ''}`}>
      <div className="kuro-academy-v3__jutsu-badges flex flex-wrap justify-center gap-2 mb-4 w-full">
        <span className="badge badge-muted">{jutsu.category || jutsu.type || 'Jutsu'}</span>
        {jutsu.element && <span className="badge badge-gold">{jutsu.element}</span>}
        {isLearned ? (
          <span className="badge badge-green">Aprendido</span>
        ) : status.eligible ? (
          <span className="badge badge-green">Disponível</span>
        ) : (
          <span className="badge badge-red">Bloqueado</span>
        )}
      </div>

      <div className="kuro-academy-v3__jutsu-art w-16 h-16 rounded-md bg-ink-raised border border-line-bright flex items-center justify-center overflow-hidden mb-3">
        <JutsuArtwork key={jutsu.id ?? jutsu.name} jutsu={jutsu} />
      </div>

      <h3 className="kuro-academy-v3__jutsu-title paper font-bold text-base mb-2">{jutsu.name}</h3>
      <p className="kuro-academy-v3__jutsu-rank muted text-xs mb-3">
        {rank ? `Graduação: ${rank}` : 'Sem requisito de graduação'}
        {' · '}Nível {level}
      </p>
      {jutsu.description && (
        <p className="kuro-academy-v3__jutsu-description muted text-xs leading-relaxed mb-3 line-clamp-3">{jutsu.description}</p>
      )}
      <div className="kuro-academy-v3__jutsu-metrics grid grid-cols-2 gap-2 text-xs w-full mb-4" aria-label="Características da técnica">
        <span className="bg-ink-raised rounded p-2 muted">Dano <strong className="paper">{damage}</strong></span>
        <span className="bg-ink-raised rounded p-2 muted">Chakra <strong className="paper">{chakra}</strong></span>
        <span className="bg-ink-raised rounded p-2 muted">Precisão <strong className="paper">{accuracy}</strong></span>
        <span className="bg-ink-raised rounded p-2 muted">Recarga <strong className="paper">{cooldown}</strong></span>
      </div>

      {showRequisites && (
        <details className="kuro-academy-v3__jutsu-details w-full text-left mb-4 rounded border border-line-bright p-3">
          <summary className="text-gold text-xs cursor-pointer select-none">
            Ver requisitos ({status.requirements.filter(req => !req.met).length} pendente(s))
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {status.requirements.map(req => (
              <li key={req.key} className={`text-xs ${req.met ? 'muted' : 'text-danger'}`}>
                <span aria-hidden="true">{req.met ? '✓' : '✕'} </span>{req.label}
              </li>
            ))}
          </ul>
        </details>
      )}
      {!isLearned && !status.eligible && (
        <p className="kuro-academy-v3__jutsu-blocked text-danger text-xs mb-3 w-full" role="status">
          Pendente: {status.reasons.slice(0, 2).join(', ')}
          {status.reasons.length > 2 ? ` e mais ${status.reasons.length - 2}` : ''}
        </p>
      )}

      <div className="kuro-academy-v3__jutsu-footer mt-auto w-full">
        <p className="gold mono text-sm mb-3"><small className="kuro-academy-v3__cost-label">Custo no catálogo</small> RY$ {status.cost.toLocaleString('pt-BR')}</p>
        <button type="button"
          className={isLearned ? 'btn-ghost w-full' : 'btn-primary w-full'}
          disabled={disabled}
          onClick={disabled ? undefined : onLearn}
          aria-label={isLearned ? `${jutsu.name} aprendido` : `Aprender ${jutsu.name}`}
        >
          <span>{isLearned ? '✓ Aprendido' : loading ? 'Aguarde...' : status.eligible ? 'Aprender jutsu' : 'Requisitos pendentes'}</span>
        </button>
      </div>
    </article>
  );
}
