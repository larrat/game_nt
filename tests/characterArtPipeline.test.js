import test from 'node:test';
import assert from 'node:assert/strict';
import { planArtwork, processArtwork } from '../scripts/prepare-character-art.mjs';

const catalog = { characters: [{ id: 'ng-initial-69' }] };
const valid = {
  characterId: 'ng-initial-69', variantId: 'base',
  sourcePath: 'assets/approved-character-art/hinata.png',
  approved: true,
  rightsBasis: 'Explicit permission to publish and transform this asset.',
  rightsEvidence: 'permission-dossier/reference-001.pdf'
};

test('approved portrait maps a canonical character to a deterministic public asset', () => {
  const result = planArtwork({ entries: [valid] }, catalog, '/repo');
  assert.deepEqual(result.problems, []);
  assert.equal(result.plan[0].publicUrl, '/images/characters/ng-initial-69--base.webp');
});

test('rejects reference-folder sources, traversal and duplicate outputs', () => {
  const result = planArtwork({ entries: [
    { ...valid, sourcePath: 'docs/reverse-engineering/photo.png' },
    { ...valid, sourcePath: 'assets/approved-character-art/../../secret.png' },
    valid, valid
  ] }, catalog, '/repo');
  assert.equal(result.plan.length, 1);
  assert.equal(result.problems.length, 3);
});

test('rejects unapproved, unknown and unverifiable character art', () => {
  const result = planArtwork({ entries: [
    { ...valid, approved: false },
    { ...valid, characterId: 'unknown' },
    { ...valid, rightsEvidence: '' },
    { ...valid, variantId: '../other' }
  ] }, catalog, '/repo');
  assert.equal(result.plan.length, 0);
  assert.equal(result.problems.length, 4);
});

test('default pipeline has no side effects and never publishes reference media', async () => {
  const report = await processArtwork({ write: false });
  assert.equal(report.mode, 'DRY_RUN');
  assert.equal(report.approvedEntries, 0);
  assert.equal(report.writtenFiles, 0);
  assert.ok(report.catalogCharacters >= 180);
});

test('publishing requires explicit gate even with an empty manifest', async () => {
  await assert.rejects(processArtwork({ write: true }), /ART_PUBLICATION_APPROVED/);
});
