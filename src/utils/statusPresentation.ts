/** Estrutura da tela Status baseada nas colunas existentes em public.players.
 * Sem inventar estatísticas históricas de round e sem consultar outros jogadores.
 */
export const BASIC_ATTRIBUTES = [
  { key: 'taijutsu', label: 'Taijutsu' },
  { key: 'bukijutsu', label: 'Bukijutsu' },
  { key: 'ninjutsu', label: 'Ninjutsu' },
  { key: 'genjutsu', label: 'Genjutsu' },
  { key: 'forca', label: 'Força' },
  { key: 'agilidade', label: 'Agilidade' },
  { key: 'inteligencia', label: 'Inteligência' },
  { key: 'selo', label: 'Selos' },
  { key: 'resistencia', label: 'Resistência' },
  { key: 'energia', label: 'Energia' }
] as const;

export type BasicAttributeKey = typeof BASIC_ATTRIBUTES[number]['key'];

export interface StatusAccountRecord {
  wins_dojo?: number | null;
  losses_dojo?: number | null;
  wins_pvp?: number | null;
  losses_pvp?: number | null;
  npc_wins?: number | null;
  tasks_completed?: number | null;
  missions_s?: number | null;
  missions_a?: number | null;
  missions_b?: number | null;
  missions_c?: number | null;
  missions_d?: number | null;
  bingo_book_kills?: number | null;
  daily_trainings?: number | null;
  fugas?: number | null;
}
export interface StatusAccountRow {
  key: keyof StatusAccountRecord;
  label: string;
  value: string;
}
const ACCOUNT_FIELDS: ReadonlyArray<{ key: keyof StatusAccountRecord; label: string }> = [
  { key: 'wins_dojo', label: 'Vitórias no Dojo' },
  { key: 'losses_dojo', label: 'Derrotas no Dojo' },
  { key: 'wins_pvp', label: 'Vitórias PvP' },
  { key: 'losses_pvp', label: 'Derrotas PvP' },
  { key: 'npc_wins', label: 'Vitórias contra NPCs' },
  { key: 'tasks_completed', label: 'Tarefas concluídas' },
  { key: 'missions_s', label: 'Missões rank S' },
  { key: 'missions_a', label: 'Missões rank A' },
  { key: 'missions_b', label: 'Missões rank B' },
  { key: 'missions_c', label: 'Missões rank C' },
  { key: 'missions_d', label: 'Missões rank D' },
  { key: 'bingo_book_kills', label: 'Alvos do Bingo Book' },
  { key: 'daily_trainings', label: 'Treinos registrados hoje' },
  { key: 'fugas', label: 'Fugas de combate' }
];

export function formatStatusNumber(input: unknown): string {
  const n = Number(input);
  return input === null || input === undefined || input === '' || !Number.isFinite(n)
    ? '—'
    : Math.trunc(n).toLocaleString('pt-BR');
}

export function getStatusAccountRows(player: StatusAccountRecord): StatusAccountRow[] {
  return ACCOUNT_FIELDS.map(({ key, label }) => ({
    key, label, value: formatStatusNumber(player[key])
  }));
}
