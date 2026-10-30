import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const jutsu=readFileSync(new URL('../src/components/JutsuCard.jsx',import.meta.url),'utf8');
const treino=readFileSync(new URL('../src/pages/Treino.jsx',import.meta.url),'utf8');
const missoes=readFileSync(new URL('../src/pages/Tarefas.jsx',import.meta.url),'utf8');
const tecnicas=readFileSync(new URL('../src/pages/Tecnicas.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/academy-v3.css',import.meta.url),'utf8');

test('jutsu card distinguishes requirements and server catalog cost',()=>{
  assert.ok(jutsu.includes('getJutsuEligibility'));
  assert.ok(jutsu.includes('status.requirements.filter'));
  assert.ok(jutsu.includes('status.reasons'));
  assert.ok(jutsu.includes('Custo no catálogo'));
  assert.ok(jutsu.includes('role="status"'));
  assert.ok(jutsu.includes('disabled={disabled}'));
  assert.ok(jutsu.includes('onClick={disabled ? undefined : onLearn}'));
});
test('training distinguishes forecast from confirmed receipt and keeps RPC',()=>{
  assert.ok(treino.includes("getTrainingRange"));
  assert.ok(treino.includes('kuro-academy-v3__estimate'));
  assert.ok(treino.includes('O servidor sorteia o resultado'));
  assert.ok(treino.includes('kuro-academy-v3__receipt'));
  assert.ok(treino.includes("supabase.rpc('treinar_atributos'"));
});
test('missions distinguish predicted rewards from server-confirmed credit',()=>{
  assert.ok(missoes.includes('XP previsto'));
  assert.ok(missoes.includes('Ryous previstos'));
  assert.ok(missoes.includes('Recompensas previstas:'));
  assert.ok(missoes.includes('Catálogo · Recompensa prevista'));
  assert.ok(missoes.includes("supabase.rpc('finalizar_missao'"));
  assert.ok(missoes.includes('formatMissionCompletionMessage(data, player.rank)'));
});
test('academy has accessible details and responsive card layouts',()=>{
  assert.ok(tecnicas.includes('kuro-academy-v3__catalog-grid'));
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /@media\(max-width:920px\)/);
  assert.match(css, /focus-visible/);
});
