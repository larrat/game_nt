import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDashboardAttributes, getDashboardNextAction } from '../src/utils/dashboardOverview.js';
import { STARTING_ATTRIBUTES } from '../src/utils/startingClassProfiles.js';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('dashboard presents ten canonical attributes without fabricating missing values', () => {
  const attrs = getDashboardAttributes({forca:0,ninjutsu:4,energia:'2',genjutsu:null,bukijutsu:undefined,taijutsu:-1});
  assert.equal(attrs.length, 10);
  assert.deepEqual(attrs.map(a=>a.key), STARTING_ATTRIBUTES.map(a=>a.key));
  const get = key => attrs.find(a=>a.key===key).value;
  assert.equal(get('forca'),0);
  assert.equal(get('ninjutsu'),4);
  assert.equal(get('energia'),2);
  assert.equal(get('genjutsu'),null);
  assert.equal(get('bukijutsu'),null);
  assert.equal(get('taijutsu'),null);
});

test('next step gives priority to real mission, points, daily training, then neutral exploration', () => {
  assert.equal(getDashboardNextAction({active_missions:[{id:1}],pontos_atributos:5}).path,'/tarefas');
  assert.equal(getDashboardNextAction({active_missions:[],pontos_atributos:3}).path,'/treino');
  assert.equal(getDashboardNextAction({active_missions:[],pontos_atributos:0,daily_trainings:0}).title,'Treine seu ninja');
  assert.equal(getDashboardNextAction({active_missions:[],pontos_atributos:0,daily_trainings:2}).title,'Continue sua jornada');
  assert.equal(getDashboardNextAction({}).title,'Continue sua jornada');
  assert.equal(getDashboardNextAction(null).path,'/selecionar');
});

test('dashboard V3 binds profile stats to the canonical UI, with responsive styles', () => {
  const source=read('src/pages/Dashboard.jsx');
  const css=read('src/styles/dashboard-overview-v3.css');
  assert.ok(source.includes('getDashboardAttributes(player)'));
  assert.ok(source.includes('getDashboardNextAction(player)'));
  assert.ok(source.includes('dashboardAttributes.map(attribute => ('));
  assert.ok(source.includes("attribute.value === null ? '—'"));
  assert.ok(source.includes('navigate(nextAction.path)'));
  assert.ok(source.includes("navigate('/status')"));
  assert.ok(source.includes('kuro-dashboard-v3__first-actions'));
  assert.ok(css.includes('repeat(5, minmax(0,1fr))'));
  assert.ok(css.includes('@media (max-width: 720px)'));
  assert.ok(css.includes('focus-visible'));
});

test('dashboard does not advertise fixed prizes that may differ from server RPC results', () => {
  const source=read('src/pages/Dashboard.jsx');
  assert.ok(!source.includes('rewardText="RY$ 20"'));
  assert.ok(!source.includes('<strong>RY$ 50</strong>'));
  assert.ok(source.includes('data.reward_amount'));
  assert.ok(source.includes("rpc('reivindicar_bonus_diario'"));
  assert.ok(source.includes("rpc('reivindicar_recompensa_diaria'"));
});
