import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const presentation = readFileSync(new URL('../src/utils/statusPresentation.ts', import.meta.url), 'utf8');
const out = ts.transpileModule(presentation, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
});
const { BASIC_ATTRIBUTES, getStatusAccountRows, formatStatusNumber } = await import(
  'data:text/javascript;base64,' + Buffer.from(out.outputText).toString('base64')
);
const status = readFileSync(new URL('../src/pages/Status.jsx', import.meta.url), 'utf8');
const meter = readFileSync(new URL('../src/components/CharacterResourceMeter.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/character-status-v3.css', import.meta.url), 'utf8');

test('os dez atributos básicos têm fontes únicas nas colunas de players', () => {
  assert.deepEqual(
    BASIC_ATTRIBUTES.map(x => x.key),
    ['taijutsu','bukijutsu','ninjutsu','genjutsu','forca','agilidade','inteligencia','selo','resistencia','energia']
  );
  assert.match(status, /getTotalStat\(player, attribute\.key\)/);
});

test('estatísticas de conta não inventam valores quando os dados não existem', () => {
  const sample = getStatusAccountRows({
    wins_dojo: 0, wins_pvp: 2345, npc_wins: null, tasks_completed: 9, missions_s: 0
  });
  assert.equal(sample.find(x => x.key === 'wins_dojo').value, '0');
  assert.equal(sample.find(x => x.key === 'wins_pvp').value, '2.345');
  assert.equal(sample.find(x => x.key === 'npc_wins').value, '—');
  assert.equal(sample.find(x => x.key === 'tasks_completed').value, '9');
  assert.equal(sample.find(x => x.key === 'missions_a').value, '—');
  assert.equal(sample.find(x => x.key === 'missions_s').value, '0');
  assert.equal(sample.length, 14);
  assert.equal(formatStatusNumber(undefined), '—');
  assert.equal(formatStatusNumber(null), '—');
  assert.equal(formatStatusNumber(Number.NaN), '—');
  assert.equal(formatStatusNumber(0), '0');
});

test('Status expõe treze indicadores derivados do motor sem placares fictícios', () => {
  const functions = [
    'calculateAtkTaiBuk','calculateAtkNinGen','calculateDefTaiBuk','calculateDefNinGen',
    'calculatePerfuracao','calculatePrecisao','calculateConcentracao','calculatePercepcao',
    'calculateConviccao','calculateDeterminacao','calculateCritChance','calculateDodgeChance',
    'calculateChakraDiscount'
  ];
  for (const name of functions) assert.ok(status.includes(name + '(player)'), name);
  assert.match(status, /getStatusAccountRows\(player\)/);
  assert.match(status, /accountRows\.map/);
  assert.doesNotMatch(status, /Dias no round:/);
  assert.doesNotMatch(status, /Pacotes abertos:/);
  assert.doesNotMatch(status, /<span className="paper">0<\/span>/);
  assert.ok(status.includes('!!player.element'));
});

test('retrato interativo e medidores respeitam movimento reduzido', () => {
  assert.match(status, /useReducedMotion\(\)/);
  assert.match(status, /initial=\{reduceMotion \? false/);
  assert.match(status, /<motion\.section/);
  assert.ok(status.includes('Alterar avatar de'));
  assert.match(status, /<CharacterResourceMeter/);
  assert.match(meter, /<progress/);
  assert.ok(meter.includes('aria-label={label}'));
  assert.match(meter, /getResourceProgress/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('mantém seleção de título e avatar via RPC existente', () => {
  assert.match(status, /supabase\.rpc\('atualizar_titulo_jogador'/);
  assert.match(status, /disabled=\{savingTitle\}/);
  assert.match(status, /<AvatarModal/);
  assert.match(status, /updatePlayer\(player\.id\)/);
});
