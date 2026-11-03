import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SNAPSHOT_PATH,
  auditCharacterAssets,
  safePublicPath
} from '../scripts/audit-character-asset-coverage.mjs';

const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));

test('dated canonical snapshot excludes users and documents the correct catalog scale', () => {
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.observedOn, '2026-11-03');
  assert.equal(snapshot.characters.length, 188);
  assert.equal(snapshot.avatars.length, 222);
  assert.ok(snapshot.characters.every(c => Object.keys(c).sort().join(',') ===
    ['base_avatar_url', 'id', 'name'].sort().join(',')));
  assert.ok(snapshot.avatars.every(a => !('user_id' in a) && !('player_id' in a)));
});

test('real local portrait URLs remain safe and are served from the repository', async () => {
  const report = await auditCharacterAssets(snapshot);
  assert.equal(report.localAvatarIds, 31);
  assert.equal(report.externalAvatarIds, 191);
  assert.equal(report.externalAvatarIdsWithVerifiedLocalCopy, 3);
  assert.equal(report.displayLocalAvatarIds, 34);
  assert.equal(report.displayRemoteAvatarIds, 188);
  assert.equal(report.basePortraitsLocal, 7);
  assert.equal(report.basePortraitsRemote, 181);
  assert.equal(report.mirrorChecks.length, 3);
  assert.ok(report.mirrorChecks.every(x => x.matched), 'provenance copies must have equal SHA256');
  assert.deepEqual(report.missingLocalFiles, [], 'a local avatar must never point at an absent file');
  assert.deepEqual(report.issues, [], 'canonical catalog should contain no invalid local references');
});

test('asset audit never permits path traversal or non-image public paths', () => {
  const pub = '/tmp/kuro-audit-public';
  assert.equal(safePublicPath('/images/avatares/sasuke_01_kunai.png', pub),
    '/tmp/kuro-audit-public/images/avatares/sasuke_01_kunai.png');
  for (const invalid of [
    'https://example.org/a.png', '/images/../private.txt', '/etc/passwd',
    '/images/any.png?token=secret', '/images/any.png#fragment',
    '/images/any\\folder.png', null
  ]) assert.equal(safePublicPath(invalid, pub), null, String(invalid));
});

test('foreign character associations and missing local assets fail closed', async () => {
  const altered = {
    ...snapshot,
    characters: snapshot.characters.slice(0, 1),
    avatars: [
      { id: '/images/not-here.png', name: 'bad', character_id: 'no-such-ninja',
        is_base: true, evolution_target_id: 'also-missing' }
    ]
  };
  const report = await auditCharacterAssets(altered, { inspectDimensions: false });
  assert.ok(report.issues.some(s => /sem character_id válido/.test(s)));
  assert.ok(report.issues.some(s => /evolução aponta/.test(s)));
  assert.ok(report.issues.some(s => /local ausente/.test(s)));
  assert.ok(report.missingLocalFiles.includes('/images/not-here.png'));
});
