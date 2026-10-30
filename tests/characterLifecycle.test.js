import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const rulesSource=readFileSync(new URL('../src/utils/characterCreationRules.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(rulesSource, {compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext
}});
const {MAX_CHARACTERS_PER_ACCOUNT,validateCharacterName,canCreateCharacter}=await import(
  'data:text/javascript;base64,'+Buffer.from(compiled.outputText).toString('base64')
);
const create=readFileSync(new URL('../src/pages/Criar.jsx',import.meta.url),'utf8');
const select=readFileSync(new URL('../src/pages/Selecionar.jsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const sql=readFileSync(new URL('../migrations/062_secure_character_registration_and_deletion.sql',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/character-creation.css',import.meta.url),'utf8');

test('name contract matches server: min 3, max 24, trimmed, no control characters',()=>{
  assert.equal(MAX_CHARACTERS_PER_ACCOUNT,3);
  assert.ok(validateCharacterName(' a '));
  assert.equal(validateCharacterName('  Naruto  '),null);
  assert.equal(validateCharacterName('x'.repeat(24)),null);
  assert.ok(validateCharacterName('x'.repeat(25)));
  assert.ok(validateCharacterName('a\nbcd'));
});
test('three characters are allowed, fourth is forbidden; unknown catalog disables submission',()=>{
  assert.equal(canCreateCharacter(0,3),true);
  assert.equal(canCreateCharacter(2,1),true);
  assert.equal(canCreateCharacter(3,3),false);
  assert.equal(canCreateCharacter(null,3),false);
  assert.equal(canCreateCharacter(1,0),false);
  assert.equal(canCreateCharacter(-1,2),false);
});
test('server serializes per account and checks user ownership and typed confirmation',()=>{
  assert.ok(sql.includes('v_existing_count >= 3'));
  assert.ok(sql.includes('pg_advisory_xact_lock'));
  assert.ok(sql.includes("WHERE user_id = auth.uid()"));
  assert.ok(sql.includes("p_confirmation IS DISTINCT FROM v_player.name"));
  assert.ok(sql.includes("DELETE FROM public.battle_logs WHERE player_id = v_player.id"));
  assert.ok(sql.includes("WHERE id = v_player.id AND user_id = auth.uid()"));
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.excluir_personagem'));
  assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.excluir_personagem(integer,text) TO authenticated'));
  assert.equal((sql.match(/CASE v_class/g)||[]).length,10);
});
test('creation is blocked on bad data and uses the same server-side RPC',()=>{
  assert.ok(create.includes("rpc('criar_personagem'"));
  assert.ok(create.includes('canCreateCharacter(accountCount, characters.length)'));
  assert.ok(create.includes('validateCharacterName(cleanedName)'));
  assert.ok(create.includes('accountResult.error || accountResult.count == null'));
  assert.ok(create.includes('catalogError'));
  assert.ok(create.includes('aria-pressed='));
  assert.ok(create.includes('maxLength={24}'));
  assert.ok(!create.includes('placehold.co'));
});
test('deletion never uses a direct table write and requires server confirmation',()=>{
  assert.ok(select.includes("rpc('excluir_personagem'"));
  assert.ok(select.includes('window.prompt('));
  assert.ok(select.includes('confirmation !== char.name'));
  assert.ok(select.includes('data?.success'));
  assert.ok(!select.includes("from('players').delete()"));
  assert.ok(app.includes(".eq('user_id', session.user.id)"));
  assert.ok(app.includes('return false;'));
});
test('the form renders with accessible buttons and responsive widths',()=>{
  assert.ok(css.includes('focus-visible'));
  assert.ok(css.includes('@media(max-width:760px)'));
  assert.ok(css.includes('@media(max-width:390px)'));
  assert.ok(create.includes('aria-labelledby="character-create-visual-label"'));
});
