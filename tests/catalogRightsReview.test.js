import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const s=readFileSync(new URL('../migrations/072_art_rights_approval_gate.sql',import.meta.url),'utf8');
test('unlicensed and staged content remain pending, with no gameplay or portrait publication',()=>{
 assert.ok(s.includes("'pending_rights'"));
 assert.ok(s.includes("'pending_review'"));
 assert.ok(s.includes("license_document_ref"));
 assert.ok(s.includes("gameplay_spec_ref"));
 assert.ok(s.includes("rights_proof_ref"));
 assert.ok(s.includes("approved_local_path LIKE '/images/%'"));
 assert.ok(s.includes("FROM content_reference.entries"));
 assert.ok(s.includes("FROM public.characters"));
 assert.ok(s.includes("ENABLE ROW LEVEL SECURITY"));
 assert.ok(!s.includes("UPDATE public.characters"));
 assert.ok(!s.includes("SET gameplay_enabled = true"));
 assert.ok(!s.includes("SET review_status = 'approved'"));
});