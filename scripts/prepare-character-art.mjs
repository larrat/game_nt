#!/usr/bin/env node
/**
 * Local-only, opt-in character portrait pipeline.
 * This never downloads reference images or guesses that two characters match.
 * Only explicitly approved source files may be published.
 */
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, relative, dirname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_MANIFEST = 'data/approved-character-art.json';
export const APPROVED_SOURCE_DIR = 'assets/approved-character-art';

const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(value);
const inside = (root, filename) => {
  const rel = relative(root, filename);
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + sep) && !rel.startsWith('/') && !rel.startsWith('\\');
};

export function planArtwork(manifest, catalog, root = process.cwd()) {
  const problems = [];
  if (!manifest || !Array.isArray(manifest.entries)) {
    throw new Error('Manifest requires an entries array.');
  }
  const known = new Set((catalog.characters || []).map(row => row.id));
  const srcRoot = resolve(root, APPROVED_SOURCE_DIR);
  const outputRoot = resolve(root, 'public/images/characters');
  const outputs = new Set();
  const plan = [];
  for (const [index, item] of manifest.entries.entries()) {
    const tag = 'entries[' + index + ']';
    if (!item || !validId(item.characterId) || !validId(item.variantId) ||
        !known.has(item.characterId)) {
      problems.push(tag + ': unknown or unsafe character/variant identifier');
      continue;
    }
    if (item.approved !== true || typeof item.rightsBasis !== 'string' ||
        item.rightsBasis.trim().length < 12 || typeof item.rightsEvidence !== 'string' ||
        item.rightsEvidence.trim().length < 8) {
      problems.push(tag + ': documented approval, rights basis and evidence required');
      continue;
    }
    if (typeof item.sourcePath !== 'string' ||
        !/\\.(?:png|jpe?g|webp)$/i.test(item.sourcePath)) {
      problems.push(tag + ': sourcePath must be a local PNG/JPG/WebP');
      continue;
    }
    const input = resolve(root, item.sourcePath);
    if (!inside(srcRoot, input)) {
      problems.push(tag + ': source must stay inside ' + APPROVED_SOURCE_DIR);
      continue;
    }
    const output = resolve(outputRoot, item.characterId + '--' + item.variantId + '.webp');
    if (!inside(outputRoot, output) || outputs.has(output)) {
      problems.push(tag + ': duplicate or invalid output');
      continue;
    }
    outputs.add(output);
    plan.push({ characterId: item.characterId, variantId: item.variantId, input, output,
      publicUrl: '/images/characters/' + item.characterId + '--' + item.variantId + '.webp' });
  }
  return { plan, problems, catalogCount: known.size };
}

export async function processArtwork({ root = process.cwd(), manifestPath = DEFAULT_MANIFEST,
  write = false, approval = '' } = {}) {
  const manifestFile = resolve(root, manifestPath);
  const dataRoot = resolve(root, 'data');
  if (!inside(dataRoot, manifestFile) || !/\\.json$/i.test(manifestFile)) {
    throw new Error('Manifest must be a JSON file under data/');
  }
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  const catalog = JSON.parse(readFileSync(resolve(root, 'data/reference/initial-characters.json'), 'utf8'));
  const result = planArtwork(manifest, catalog, root);
  if (result.problems.length) throw new Error(result.problems.join('\n'));
  if (write && approval !== 'YES_ART_PUBLICATION_APPROVED') {
    throw new Error('--write requires ART_PUBLICATION_APPROVED=YES_ART_PUBLICATION_APPROVED');
  }
  let processed = 0;
  const errors = [];
  const sharp = result.plan.length ? (await import('sharp')).default : null;
  for (const item of result.plan) {
    if (!existsSync(item.input)) { errors.push('Missing: ' + relative(root,item.input)); continue; }
    const meta = await sharp(item.input).metadata();
    if (!meta.width || !meta.height || Math.min(meta.width,meta.height) < 512) {
      errors.push('Insufficient source resolution (minimum short side 512px): ' + relative(root,item.input));
      continue;
    }
    if (write) {
      mkdirSync(dirname(item.output), { recursive: true });
      await sharp(item.input).rotate().resize({
        width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true
      }).webp({ quality: 86, effort: 5 }).toFile(item.output);
      processed++;
    }
  }
  return { mode: write ? 'WRITE_APPROVED_ONLY' : 'DRY_RUN', catalogCharacters: result.catalogCount,
    approvedEntries: result.plan.length, verifiedEntries: result.plan.length - errors.length,
    writtenFiles: processed, errors, assets: result.plan.map(({ characterId, variantId, publicUrl }) =>
      ({ characterId, variantId, publicUrl })) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const write = process.argv.includes('--write');
  processArtwork({ write, approval: process.env.ART_PUBLICATION_APPROVED || '' })
    .then(result => { console.log(JSON.stringify(result, null, 2)); if (result.errors.length) process.exitCode=1; })
    .catch(error => { console.error(error.message); process.exitCode=1; });
}
