import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql=readFileSync(new URL('../scripts/audit-rpc-privileges.sql',import.meta.url),'utf8');
const types=readFileSync(new URL('../src/types/database.generated.ts',import.meta.url),'utf8');

test('SQL audit checks both grants, authentication reference and fixed search path',()=>{
  for(const rule of ["has_function_privilege('anon'","has_function_privilege('authenticated'","position('auth.uid()'","search_path=%","pg_proc","pg_class"]) {
    assert.ok(sql.includes(rule),rule);
  }
  assert.ok(!/\b(?:CREATE|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE)\s+(?:public\.|TABLE|FUNCTION|INTO|FROM)/i.test(sql));
});

test('generated database types include real public schema tables and functions',()=>{
  assert.match(types,/export type Database\s*=/);
  for(const key of ["players:","jutsus:","missions:","Functions:"]) assert.ok(types.includes(key),key);
  assert.ok(!types.includes('SUPABASE_SERVICE_ROLE_KEY'));
});
