import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const css = read('src/styles/experience-workflows-v2.css');
const app = read('src/App.jsx');
const dashboard = read('src/pages/Dashboard.jsx');

const modules = [
  ['src/pages/Treino.jsx', 'kuro-training-page', 'treinar_atributos'],
  ['src/pages/Tecnicas.jsx', 'kuro-jutsu-academy-page', 'aprender_jutsu'],
  ['src/pages/Tarefas.jsx', 'kuro-missions-page', 'iniciar_missao'],
  ['src/pages/Combate.jsx', 'kuro-combat-page', 'resolver_turno_combate_sessao']
];

test('gameplay workflow theme is installed with the main experience stylesheet', () => {
  assert.ok(app.includes("import './styles/experience-v2.css'"));
  assert.ok(app.includes("import './styles/experience-workflows-v2.css'"));
  assert.ok(app.indexOf("import './styles/experience-v2.css'") <
    app.indexOf("import './styles/experience-workflows-v2.css'"));
});

test('theme scopes all four actual gameplay workflows and retains server-authoritative handlers', () => {
  for (const [file, selector, rpc] of modules) {
    const source = read(file);
    assert.ok(source.includes(selector), file + ' root selector');
    assert.ok(css.includes('.' + selector), selector + ' stylesheet');
    assert.ok(source.includes("rpc('" + rpc + "'"), rpc + ' kept in original workflow');
    assert.ok(source.includes('PageHeader'), file + ' screen header');
  }
  assert.ok(css.includes('kuro-academy-v3__receipt'));
  assert.ok(css.includes('kuro-academy-v3__estimate'));
  assert.ok(css.includes('kuro-combat-v3__turn'));
  assert.ok(css.includes('kuro-mission-catalog'));
});

test('gameplay UI supports mobile, focus states and reduced motion', () => {
  for (const label of ['max-width: 900px','max-width: 640px','prefers-reduced-motion: reduce','focus-visible',':disabled']) {
    assert.ok(css.includes(label), label);
  }
  assert.ok(css.includes('overflow-x: auto'));
});

test('daily mission indicators use accessible native progress rather than appearance inline styles', () => {
  assert.ok(dashboard.includes('<progress className={"kuro-quest__meter " + progressColor}'));
  assert.ok(dashboard.includes('aria-label={title + " — progresso"}'));
  assert.ok(dashboard.includes('value={progressCurrent} max={progressMax}'));
  assert.ok(!dashboard.includes('style={{ width: progressPercent'));
  assert.ok(css.includes('kuro-quest__meter::-webkit-progress-value'));
  assert.ok(css.includes('kuro-quest__meter::-moz-progress-bar'));
});
