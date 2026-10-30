import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const panelSource = readFileSync(new URL('../src/components/CombatTurnPanel.tsx',import.meta.url),'utf8');
const combat = readFileSync(new URL('../src/pages/Combate.jsx',import.meta.url),'utf8');
const css = readFileSync(new URL('../src/styles/combat-v3.css',import.meta.url),'utf8');

test('turn display clamps invalid timer and keeps the countdown semantic', () => {
  const compiled = ts.transpileModule('export const clampTurnSeconds = ' +
    panelSource.split('export const clampTurnSeconds = ')[1].split(';\n\nexport default')[0] + ';', {
    compilerOptions: {target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
  });
  const module = {exports:{}};
  new Function('module','exports',compiled.outputText)(module,module.exports);
  const clamp=module.exports.clampTurnSeconds;
  assert.equal(clamp(-10),0);
  assert.equal(clamp(42),30);
  assert.equal(clamp(8.7),8);
  assert.equal(clamp(Number.NaN),0);
});
test('turn status is readable and browser progress is accessible',()=>{
  assert.match(panelSource, /aria-label="Estado do combate"/);
  assert.match(panelSource, /role="status"/);
  assert.match(panelSource, /aria-valuetext=/);
  assert.match(panelSource, /'Validando sessão'/);
  assert.match(panelSource, /'Aguardando adversário'/);
});
test('UI keeps original RPCs authoritative while making actions legible',()=>{
  for(const api of ['resolver_turno_combate_sessao','atacar_world_boss','finalizar_combate_sessao']) {
    assert.ok(combat.includes(api),api);
  }
  assert.match(combat, /<CombatTurnPanel/);
  assert.match(combat, /aria-expanded=\{showCombatLog\}/);
  assert.ok(combat.includes('aria-label={`'));
  assert.ok(combat.includes('jutsu.name'));
  assert.ok(combat.includes('Chakra'));
  assert.match(combat, /stats.jutsuCdVal > 0 \? /);
  assert.match(combat, /stats.cost/);
  assert.match(combat, /combatSessionLoading \|\| !combatSessionId/);
});
test('responsive arena exposes collapsible log and respects reduced-motion',()=>{
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /grid-column:1\/-1/);
  assert.match(css, /focus-visible/);
});
