import type { ReactNode } from 'react';

export interface CombatTurnPanelProps {
  round: number;
  isPlayerTurn: boolean;
  remainingSeconds: number;
  sessionPending?: boolean;
  sessionFailed?: boolean;
  autoBattle?: boolean;
}

export const clampTurnSeconds = (input: number, maxSeconds = 30): number => {
  if (!Number.isFinite(input)) return 0;
  return Math.max(0, Math.min(maxSeconds, Math.trunc(input)));
};

export default function CombatTurnPanel({
  round, isPlayerTurn, remainingSeconds, sessionPending = false,
  sessionFailed = false, autoBattle = false
}: CombatTurnPanelProps): ReactNode {
  const remaining = clampTurnSeconds(remainingSeconds);
  const label = sessionFailed ? 'Combate não validado' :
    sessionPending ? 'Validando sessão' :
    autoBattle ? 'Batalha automática' :
    isPlayerTurn ? 'Sua vez de agir' : 'Aguardando adversário';
  return (
    <section
      className={'kuro-combat-v3__turn' + (isPlayerTurn ? ' is-player-turn' : ' is-enemy-turn')}
      aria-label="Estado do combate"
    >
      <div className="kuro-combat-v3__turn-top">
        <div className="kuro-combat-v3__phase">
          <span className="kuro-combat-v3__round">TURNO {Math.max(1, Math.trunc(Number(round) || 1))}</span>
          <strong role="status" aria-live="polite">{label}</strong>
        </div>
        <div className="kuro-combat-v3__timer">
          <span>Tempo para agir</span>
          <strong className={isPlayerTurn && remaining <= 10 ? 'is-urgent' : ''}>
            {isPlayerTurn && !autoBattle ? remaining + ' s' : '—'}
          </strong>
        </div>
      </div>
      <progress
        className="kuro-combat-v3__timer-bar"
        value={isPlayerTurn && !autoBattle ? remaining : 0}
        max={30}
        aria-label="Tempo restante do turno"
        aria-valuetext={isPlayerTurn && !autoBattle
          ? remaining + ' segundos restantes'
          : 'Temporizador inativo'}
      />
      <p className="kuro-combat-v3__turn-note">
        {sessionFailed ? 'Esta sessão não foi confirmada. Saia do combate e tente novamente.' :
          sessionPending ? 'Aguarde a confirmação do servidor antes de usar técnicas.' :
          isPlayerTurn && !autoBattle ? 'Escolha seu ataque ou jutsu antes de o tempo terminar.' :
            'Acompanhe os eventos do combate no registro abaixo.'}
      </p>
    </section>
  );
}
