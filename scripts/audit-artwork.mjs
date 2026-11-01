#!/usr/bin/env node
/**
 * Read-only inventory of character portraits. No network, database or file writes.
 * Usage: node scripts/audit-artwork.mjs
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = JSON.parse(readFileSync(resolve(root, 'data/reference/initial-characters.json'), 'utf8'));
const characters = source.characters ?? [];
const publicImages = ['naruto.jpg', 'sasuke.jpg', 'sakura.jpg', 'kakashi.jpg']
  .map(filename => ({ filename, path: resolve(root, 'public/images', filename) }));

const entries = characters.flatMap(character => (character.variants ?? []).map(variant => {
  const file = variant.localArtifactPath ? resolve(root, variant.localArtifactPath) : null;
  // A catalog reference is not proof the file is still present.
  const present = Boolean(file && file.startsWith(root + '/') && existsSync(file));
  return {
    name: character.name,
    appearance: variant.name,
    present,
    path: present ? variant.localArtifactPath : null,
    bytes: present ? statSync(file).size : 0
  };
}));

const present = entries.filter(entry => entry.present);
const missing = entries.filter(entry => !entry.present);
const report = {
  observedAt: source.observedAt,
  characterDefinitions: characters.length,
  referencedVariants: entries.length,
  localReferenceVariants: present.length,
  missingLocalReferenceVariants: missing.length,
  localReferenceBytes: present.reduce((sum, entry) => sum + entry.bytes, 0),
  publicPortraits: publicImages.map(image => ({
    name: image.filename,
    available: existsSync(image.path),
    bytes: existsSync(image.path) ? statSync(image.path).size : 0
  })),
  examplesWithoutLocalArt: missing.slice(0, 15).map(({ name, appearance }) => ({ name, appearance }))
};
console.log(JSON.stringify(report, null, 2));
