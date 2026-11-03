#!/usr/bin/env node
/**
 * Kurokage character asset preflight.
 * Read-only: audits a dated, non-player catalog snapshot against tracked public files.
 * Does not fetch remote images, write SQL, mutate player avatars or publish art.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { resolveLocalCharacterPortrait, VERIFIED_LOCAL_PROFILE_FILES } from '../src/utils/localCharacterPortrait.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const SNAPSHOT_PATH = resolve(ROOT, 'data/audits/character-asset-snapshot-2026-11-03.json');
const ORIGINALS_DIR = resolve(ROOT, 'docs/reverse-engineering/coleta-2026-10-30/personagens-catalogo/imagens');
const PUBLIC_DIR = resolve(ROOT, 'public');
const HASH = buffer => createHash('sha256').update(buffer).digest('hex');

export function safePublicPath(url, root = PUBLIC_DIR) {
  if (typeof url !== 'string' || !url.startsWith('/images/') ||
      url.includes('..') || url.includes('\\') || url.includes('?') || url.includes('#')) {
    return null;
  }
  const filepath = resolve(root, '.' + url);
  return filepath.startsWith(root + sep) ? filepath : null;
}

export async function auditCharacterAssets(snapshot, {
  publicDir = PUBLIC_DIR,
  originalsDir = ORIGINALS_DIR,
  inspectDimensions = true
} = {}) {
  const issues = [];
  if (!Array.isArray(snapshot?.characters) || !Array.isArray(snapshot?.avatars)) {
    throw new Error('Snapshot precisa de arrays characters e avatars.');
  }
  const characters = snapshot.characters;
  const avatars = snapshot.avatars;
  const ids = new Set(characters.map(x => x.id));
  const avatarIds = new Set();
  const usedLocal = new Set();
  const missingLocal = [];
  const characterCoverage = [];
  const imageInfo = {};
  const resolutionWarnings = [];

  async function inspect(url) {
    const path = safePublicPath(url, publicDir);
    if (!path) return { status: 'invalid_path', url };
    if (!existsSync(path)) {
      missingLocal.push(url);
      return { status: 'missing_local', url };
    }
    usedLocal.add(url);
    if (imageInfo[url]) return imageInfo[url];
    const stat = statSync(path);
    const info = { status: 'local', url, bytes: stat.size };
    if (inspectDimensions) {
      try {
        const metadata = await sharp(path).metadata();
        info.width = metadata.width;
        info.height = metadata.height;
        info.format = metadata.format;
        // Report low resolution honestly; this is an advisory, not automatic upscale.
        if (Math.min(info.width || 0, info.height || 0) < 512) {
          resolutionWarnings.push({ url, width: info.width, height: info.height });
        }
      } catch (error) {
        issues.push('Imagem local inválida: ' + url + ' (' + error.message + ')');
      }
    }
    imageInfo[url] = info;
    return info;
  }

  for (const avatar of avatars) {
    if (!ids.has(avatar.character_id)) {
      issues.push('Avatar sem character_id válido: ' + avatar.id);
    }
    if (avatarIds.has(avatar.id)) issues.push('ID de avatar duplicado: ' + avatar.id);
    avatarIds.add(avatar.id);
    if (avatar.evolution_target_id && !avatars.some(x => x.id === avatar.evolution_target_id)) {
      issues.push('Evolução aponta para avatar inexistente: ' + avatar.id);
    }
  }

  const localRows = avatars.filter(a => a.id.startsWith('/'));
  const remoteRows = avatars.filter(a => a.id.startsWith('https://'));
  const mappedRows = remoteRows.filter(a => resolveLocalCharacterPortrait(a.id) !== a.id);
  for (const avatar of [...localRows, ...mappedRows]) {
    const local = resolveLocalCharacterPortrait(avatar.id);
    const check = await inspect(local);
    if (check.status !== 'local') issues.push('Avatar com local ausente/inválido: ' + avatar.id + ' → ' + local);
  }
  let baseLocal = 0;
  let baseRemote = 0;
  for (const character of characters) {
    const candidate = resolveLocalCharacterPortrait(character.base_avatar_url);
    const local = candidate.startsWith('/') ? candidate : null;
    const check = local ? await inspect(local) : { status: 'remote' };
    const state = check.status === 'local' ? 'local' : check.status === 'remote' ? 'remote' : 'invalid_local';
    if (state === 'local') baseLocal++;
    else baseRemote++;
    if (state === 'invalid_local') issues.push('Imagem-base indisponível: ' + character.id + ' → ' + candidate);
    characterCoverage.push({
      id: character.id,
      name: character.name,
      state,
      avatarCount: avatars.filter(a => a.character_id === character.id).length,
      source: character.base_avatar_url,
      displaySource: candidate
    });
  }

  // Three independently verified copies must remain byte-for-byte identical to originals.
  const mirrorChecks = [];
  for (const filename of VERIFIED_LOCAL_PROFILE_FILES) {
    const source = resolve(originalsDir, filename);
    const target = resolve(publicDir, 'images/characters', filename);
    const matched = existsSync(source) && existsSync(target) &&
      HASH(readFileSync(source)) === HASH(readFileSync(target));
    mirrorChecks.push({ filename, sourceExists: existsSync(source), targetExists: existsSync(target), matched });
    if (!matched) issues.push('Cópia local não coincide com fonte identificada: ' + filename);
  }

  return {
    observedOn: snapshot.observedOn,
    characters: characters.length,
    avatars: avatars.length,
    localAvatarIds: localRows.length,
    externalAvatarIds: remoteRows.length,
    externalAvatarIdsWithVerifiedLocalCopy: mappedRows.length,
    displayLocalAvatarIds: localRows.length + mappedRows.length,
    displayRemoteAvatarIds: remoteRows.length - mappedRows.length,
    basePortraitsLocal: baseLocal,
    basePortraitsRemote: baseRemote,
    distinctPublicAssetsChecked: usedLocal.size,
    localAssetStats: Object.values(imageInfo),
    resolutionWarnings,
    missingLocalFiles: [...new Set(missingLocal)],
    mirrorChecks,
    characterCoverage,
    issues
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
  const result = await auditCharacterAssets(snapshot);
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    console.log('GAME_NT · Auditoria somente leitura · catálogo em', result.observedOn);
    console.table({
      'Personagens': result.characters,
      'Avatares': result.avatars,
      'Retratos-base locais resolvidos': result.basePortraitsLocal,
      'Retratos-base externos': result.basePortraitsRemote,
      'Avatares com caminho de exibição local': result.displayLocalAvatarIds,
      'Avatares ainda externos': result.displayRemoteAvatarIds,
      'Arquivos locais conferidos': result.distinctPublicAssetsChecked,
      'Retratos com lado menor < 512 px': result.resolutionWarnings.length,
      'Arquivos locais ausentes': result.missingLocalFiles.length,
      'Erros de integridade': result.issues.length
    });
    console.log('Referências do acervo não são automaticamente imagens publicáveis.');
    if (result.issues.length) console.error(result.issues);
  }
  if (result.issues.length) process.exitCode = 1;
}
