import type { ResourceKind } from '../types/character';
import { getResourceProgress } from '../utils/resourceProgress';

export interface CharacterResourceMeterProps {
  kind: ResourceKind;
  label: string;
  icon: string;
  current: number | null | undefined;
  max: number;
}

const format = (value: number): string => value.toLocaleString('pt-BR');

export default function CharacterResourceMeter({
  kind, label, icon, current, max
}: CharacterResourceMeterProps) {
  const progress = getResourceProgress(current ?? max, max);

  return (
    <div className={`kuro-status-v3__resource is-${kind}`}>
      <div className="kuro-status-v3__resource-heading">
        <span className="kuro-status-v3__resource-label">
          <span aria-hidden="true" className="kuro-status-v3__resource-icon"><img src={icon} alt="" width={22} height={22} /></span>
          {label}
        </span>
        <span className="kuro-status-v3__resource-value">
          {format(progress.current)} <span>/ {format(progress.max)}</span>
        </span>
      </div>
      <progress
        className={`kuro-status-v3__meter is-${kind}`}
        value={progress.current}
        max={progress.max}
        aria-label={label}
        aria-valuetext={`${format(progress.current)} de ${format(progress.max)}`}
      />
    </div>
  );
}
