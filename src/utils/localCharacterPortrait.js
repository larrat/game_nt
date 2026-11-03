// Only asset URLs with a verified, identical source path are remapped to local files.
// These copies are committed under public/images/characters/; all other URLs stay intact.
// Avatar IDs and character associations in Supabase must NEVER be rewritten to display paths.
export const VERIFIED_LOCAL_PROFILE_FILES = Object.freeze([
  '69-13.png',
  '110-2.png',
  '262-3.png'
]);

const availableFiles = new Set(VERIFIED_LOCAL_PROFILE_FILES);
const canonicalSourcePattern = /^https:\/\/narutogame\.com\.br\/assets\/images\/logado\/profile\/(\d+)\/(\d+)\.png$/i;

export function resolveLocalCharacterPortrait(src) {
  if (typeof src !== 'string') return src;
  const match = canonicalSourcePattern.exec(src);
  if (!match) return src;
  const file = match[1] + '-' + match[2] + '.png';
  return availableFiles.has(file) ? '/images/characters/' + file : src;
}
