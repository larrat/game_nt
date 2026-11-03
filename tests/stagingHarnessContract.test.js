import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../scripts/qa-two-account-staging.mjs', import.meta.url), 'utf8');

test('staging harness never runs on the connected production project', () => {
  assert.match(script, /ref === 'gvtbixbyqayhdwowgqrp'/);
  assert.match(script, /QA_MUTATIONS_APPROVED !== 'YES_STAGING_ONLY'/);
  assert.match(script, /QA_A_EMAIL === process\.env\.QA_B_EMAIL/);
});

test('staging uses only base avatars as the character creation RPC requires', () => {
  assert.match(script, /\.eq\('character_id',base\)\.eq\('is_base',true\)/);
  assert.match(script, /Staging character has no valid base avatar/);
});

test('staging handles new characters that have no unspent attribute points', () => {
  assert.match(script, /if \(oneA\.pontos_atributos > 0\)/);
  assert.match(script, /Training with zero available points must be refused/);
  assert.match(script, /assert\.equal\(trained\.data\.pontos_atributos,oneA\.pontos_atributos\)/);
});
