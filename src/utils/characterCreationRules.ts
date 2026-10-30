/** UI validation mirrors the server-side character creation contract.
 * The Supabase RPC is still authoritative for ownership, slots and economy.
 */
export const MAX_CHARACTERS_PER_ACCOUNT = 3;
export const MIN_CHARACTER_NAME_LENGTH = 3;
export const MAX_CHARACTER_NAME_LENGTH = 24;

export function validateCharacterName(input: string): string | null {
  const name = input.trim();
  if (name.length < MIN_CHARACTER_NAME_LENGTH || name.length > MAX_CHARACTER_NAME_LENGTH) {
    return 'O nome precisa ter entre 3 e 24 caracteres.';
  }
  if (/[\x00-\x1f\x7f]/.test(name)) {
    return 'O nome contém caracteres inválidos.';
  }
  return null;
}

export function canCreateCharacter(accountCount: number | null, catalogCount: number): boolean {
  return accountCount !== null &&
    Number.isInteger(accountCount) &&
    accountCount >= 0 &&
    accountCount < MAX_CHARACTERS_PER_ACCOUNT &&
    catalogCount > 0;
}
