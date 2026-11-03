#!/usr/bin/env node
/**
 * Reference-only audit. Does not import or activate any technique, NPC or image.
 * Actual playable content lives in Supabase; run the separate read-only SQL
 * audit for the live catalog.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function auditReferenceCharacters(document) {
  const errors = [], warnings = [];
  const characters = document?.characters;
  if (!Array.isArray(characters)) throw new Error('Expected characters array');
  const seenCharacters = new Set(), seenImages = new Set();
  let variants = 0, locallyDocumented = 0;
  for (const character of characters) {
    if (!character || !/^[a-z0-9_-]+$/i.test(character.id || '') ||
        typeof character.name !== 'string' || !character.name.trim()) {
      errors.push('Invalid character identity');
      continue;
    }
    if (seenCharacters.has(character.id)) errors.push('Duplicate character ID: ' + character.id);
    seenCharacters.add(character.id);
    if (!Array.isArray(character.variants) || !character.variants.length) {
      errors.push('Missing variants: ' + character.id); continue;
    }
    if (!/^https:\/\/[^\s]+$/i.test(character.base_avatar_url || '')) {
      errors.push('Invalid base portrait URL: ' + character.id);
    }
    if (!character.variants.some(variant => variant.url === character.base_avatar_url)) {
      errors.push('Base portrait has no matching variant: ' + character.id);
    }
    for (const variant of character.variants) {
      variants++;
      if (!variant || typeof variant.name !== 'string' || !variant.name.trim() ||
          !/^https:\/\/[^\s]+$/i.test(variant.url || '')) {
        errors.push('Invalid variant: ' + character.id); continue;
      }
      if (seenImages.has(variant.url)) errors.push('Duplicate variant asset URL: ' + variant.url);
      seenImages.add(variant.url);
      if (variant.localArtifactPath) {
        locallyDocumented++;
        if (typeof variant.localArtifactPath !== 'string' ||
            !variant.localArtifactPath.startsWith('docs/reverse-engineering/') ||
            variant.localArtifactPath.includes('..')) {
          errors.push('Reference path must remain in docs: ' + character.id);
        }
      }
    }
  }
  if (characters.length === 0) warnings.push('No reference characters');
  return {
    status: errors.length ? 'FAILED' : 'REFERENCE_VALID',
    mode: 'READ_ONLY_REFERENCE_NOT_GAMEPLAY',
    characters: characters.length, variants, locallyDocumented,
    externalReferences: variants-locallyDocumented, errors, warnings
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const catalog = JSON.parse(readFileSync(resolve('data/reference/initial-characters.json'),'utf8'));
    const report = auditReferenceCharacters(catalog);
    console.log(JSON.stringify(report,null,2));
    if (report.errors.length) process.exitCode=1;
  } catch (error) {
    console.error(error.message); process.exitCode=1;
  }
}
