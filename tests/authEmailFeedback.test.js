import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/authFeedback.ts',import.meta.url),'utf8');
const moduleSource = ts.transpileModule(source,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext
}}).outputText;
const { getAuthErrorMessage, isUnconfirmedEmailError } =
  await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));
const login=readFileSync(new URL('../src/pages/Login.jsx',import.meta.url),'utf8');

test('auth failures describe SMTP restrictions and rate limits accurately', () => {
  assert.match(getAuthErrorMessage({code:'email_address_not_authorized'},'signup'),/SMTP próprio/);
  assert.match(getAuthErrorMessage({code:'over_email_send_rate_limit'},'resend'),/Limite de envios/);
  assert.match(getAuthErrorMessage({status:429},'forgot'),/Muitas tentativas/);
});
test('confirmed user repeating signup is never presented as a delivered confirmation',()=>{
  assert.ok(login.includes("mode === 'pending'"));
  assert.ok(login.includes('Uma resposta de cadastro não garante que um novo e-mail foi enviado.'));
  assert.ok(!login.includes('Cadastro recebido! Confirme seu e-mail'));
  assert.ok(login.includes('setMode(\'pending\')'));
  assert.ok(login.includes('Se você já tinha cadastro, utilize Entrar ou Esqueci minha senha.'));
});
test('resend requires email, uses official endpoint and never claims delivery',()=>{
  assert.ok(login.includes("supabase.auth.resend({"));
  assert.ok(login.includes("type: 'signup'"));
  assert.ok(login.includes("emailRedirectTo: new URL('/selecionar'"));
  assert.ok(login.includes('disabled={loading || resendRequested}'));
  assert.ok(login.includes('Se houver confirmação pendente e envio habilitado'));
});
test('login offers recovery and confirmation only when appropriate',()=>{
  assert.equal(isUnconfirmedEmailError({code:'email_not_confirmed'}),true);
  assert.equal(isUnconfirmedEmailError({code:'invalid_credentials'}),false);
  assert.match(getAuthErrorMessage({code:'invalid_credentials'},'login'),/senha incorretos/);
  assert.match(getAuthErrorMessage({code:'user_already_exists'},'signup'),/já tem uma conta/);
  assert.ok(login.includes("supabase.auth.signInWithPassword"));
  assert.ok(login.includes("supabase.auth.resetPasswordForEmail"));
});
