import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditReferenceCharacters } from '../scripts/validate-reference-catalog.mjs';

const document = JSON.parse(readFileSync(
  new URL('../data/reference/initial-characters.json', import.meta.url), 'utf8'));

test('observed character dataset is valid reference, never active gameplay', () => {
  const result = auditReferenceCharacters(document);
  assert.deepEqual(result.errors, []);
  assert.equal(result.mode, 'READ_ONLY_REFERENCE_NOT_GAMEPLAY');
  assert.equal(result.characters, 184);
  assert.equal(result.variants, 191);
  assert.equal(result.locallyDocumented, 3);
});

test('duplicate IDs, image reuse and mismatched base portrait are blocked', () => {
  const example = structuredClone(document.characters[0]);
  const broken = structuredClone(example);
  broken.base_avatar_url = 'https://example.org/not-a-variant.png';
  const result = auditReferenceCharacters({ characters: [example, broken] });
  assert.ok(result.errors.some(x=>x.includes('Duplicate character ID')));
  assert.ok(result.errors.some(x=>x.includes('Duplicate variant asset URL')));
  assert.ok(result.errors.some(x=>x.includes('Base portrait has no matching variant')));
});

test('no assets may be promoted from an arbitrary reference path', () => {
  const example = structuredClone(document.characters[0]);
  example.variants[0].localArtifactPath = '../../private/file.png';
  const result = auditReferenceCharacters({ characters: [example] });
  assert.ok(result.errors.some(x => x.includes('Reference path must remain in docs')));
});

test('playable SQL audit is explicitly read-only and references canonical NPC IDs', () => {
  const sql=readFileSync(new URL('../scripts/audit-playable-catalog.sql',import.meta.url),'utf8');
  assert.match(sql,/BEGIN READ ONLY/);
  assert.match(sql,/n\.character_id/);
  assert.match(sql,/a\.is_base IS TRUE/);
  assert.ok(!/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|DROP)\s+(?:FROM|TABLE|INTO|public\.)/i.test(sql));
});
