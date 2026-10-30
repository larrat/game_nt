/**
 * Primeiro modelo TypeScript do Kurokage. Contém somente dados de apresentação.
 * As recompensas e os atributos continuam sendo definidos pelo servidor/motor.
 */
export interface CharacterSelectionRecord {
  id: number;
  name: string;
  avatar?: string | null;
  level?: number | null;
  rank?: string | null;
  village_id?: number | null;
  ryous?: number | null;
  hp?: number | null;
  chakra?: number | null;
  stamina?: number | null;
}

export type ResourceKey = 'hp' | 'chakra' | 'stamina';

export interface ResourceMaximums {
  hp: number;
  chakra: number;
  stamina: number;
}

export interface CharacterResource {
  key: ResourceKey;
  label: string;
  current: number;
  max: number;
  percent: number;
}

const resourceLabels: Record<ResourceKey, string> = {
  hp: 'Vida',
  chakra: 'Chakra',
  stamina: 'Stamina'
};

const normalizeNonNegative = (value: number | null | undefined): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : 0;
};

export function getCharacterResources(
  character: CharacterSelectionRecord,
  maximums: ResourceMaximums
): CharacterResource[] {
  const keys: ResourceKey[] = ['hp', 'chakra', 'stamina'];
  return keys.map(key => {
    const max = Math.max(1, normalizeNonNegative(maximums[key]));
    // 0 é um recurso esgotado, não um valor ausente; null/undefined indicam sem registro.
    const current = character[key] == null
      ? max
      : Math.min(max, normalizeNonNegative(character[key]));
    return {
      key,
      label: resourceLabels[key],
      current,
      max,
      percent: Math.min(100, Math.round((current / max) * 100))
    };
  });
}

export function formatCharacterRyous(value: number | null | undefined): string {
  return normalizeNonNegative(value).toLocaleString('pt-BR');
}

export function getCharacterLevel(value: number | null | undefined): number {
  return Math.max(1, normalizeNonNegative(value));
}
