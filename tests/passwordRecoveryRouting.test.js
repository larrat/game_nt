import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const login = readFileSync(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8');
const reset = readFileSync(new URL('../src/pages/RedefinirSenha.jsx', import.meta.url), 'utf8');

test('recovery token from Auth Site URL never falls through to normal game routes', () => {
  assert.ok(app.includes("recoveryHash.get('type') === 'recovery'"));
  assert.ok(app.includes("recoveryQuery.get('type') === 'recovery'"));
  assert.ok(app.includes("window.history.replaceState(null, '', '/redefinir-senha'"));
  assert.ok(app.indexOf("window.location.pathname === '/redefinir-senha'") <
    app.lastIndexOf("if (!session)"));
});
test('password recovery always points at the dedicated reset screen', () => {
  assert.ok(login.includes("new URL('/redefinir-senha', window.location.origin)"));
  assert.ok(reset.includes('supabase.auth.updateUser({ password })'));
  assert.ok(reset.includes('password !== confirmation'));
  assert.ok(reset.includes('minLength={8}'));
});
