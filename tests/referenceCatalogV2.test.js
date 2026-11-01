import test from 'node:test';
import assert from 'node:assert/strict';
import { auditReferenceV2 } from '../scripts/audit_reference_catalog_v2.mjs';

test('catalogo de referencia tem IDs distintos e nao altera gameplay', async () => {
  const audit = await auditReferenceV2('.');
  assert.deepEqual(audit.issues, []);
  assert.equal(audit.counts.initialCharacters, 184);
  assert.equal(audit.counts.characterVariants, 767);
  assert.equal(audit.counts.clans, 40);
  assert.equal(audit.counts.jutsus, 719);
  assert.equal(audit.counts.initialCatalogJutsus + audit.counts.supplementalJutsus, 719);
  assert.ok(audit.counts.additionalGalleryCharacters >= 1);
  assert.ok(audit.warnings.some(message => /n[aã]o ativar|n[aã]o habilitar/i.test(message)));
});
