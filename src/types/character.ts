// Contratos tipados para os primeiros componentes do frontend.
// A aplicação existente em JavaScript continua válida durante a migração gradual.
export interface CharacterIdentity {
  id: number;
  name: string;
  level: number;
  rank: string;
  village_id: number | null;
  avatar: string | null;
}

export type ResourceKind = 'hp' | 'chakra' | 'stamina' | 'xp';
export type ResourceTone = 'red' | 'blue' | 'yellow' | 'green' | 'purple';

export interface ResourceProgress {
  current: number;
  max: number;
  percent: number;
}

export interface ResourceMeter extends ResourceProgress {
  id: ResourceKind;
  label: string;
  icon: string;
  tone: ResourceTone;
}
