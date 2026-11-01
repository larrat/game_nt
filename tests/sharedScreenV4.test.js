import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const app = read('src/App.jsx');
const shared = read('src/styles/shared-screen-v4.css');
const status = read('src/pages/Status.jsx');
const opponents = read('src/pages/Adversarios.jsx');
const opponentCss = read('src/styles/opponents.css');
const icons = read('src/components/SidebarIcon.jsx');

test('all 31 screen modules inherit a single global theme through App', () => {
  const routes = [
    'Dashboard','Treino','Elementos','Graduacoes','Tarefas','Clas',
    'Tecnicas','AprimorarJutsus','Equipamentos','Ranking','Vila','Mapa',
    'Templo','Historico','Hospital','Dojo','Adversarios','Combate','Vip',
    'Ferreiro','Evento','Portoes','Ichiraku','Exame','Invocacoes','Historia',
    'Status','Login','RedefinirSenha','Selecionar','Criar'
  ];
  assert.ok(app.includes("import './styles/design-system-v4.css'"));
  assert.ok(app.includes("import './styles/shared-screen-v4.css'"));
  assert.ok(app.indexOf("import './styles/design-system-v4.css'") < app.indexOf("import './styles/shared-screen-v4.css'"));
  for (const name of routes) {
    assert.ok(app.includes("import('./pages/" + name + "')"), name + ' must load under the shared CSS');
  }
  for (const token of ['--kuro-bg:', '--kuro-surface:', '--kuro-gold:', '--kuro-red:', '--kuro-copy:', '--kuro-focus:']) {
    assert.ok(shared.includes(token));
  }
  assert.ok(shared.includes('.app .page'));
  assert.ok(shared.includes('.login-body'));
  assert.ok(shared.includes('.kuro-character-select'));
  assert.ok(shared.includes(':focus-visible'));
  assert.ok(shared.includes('prefers-reduced-motion'));
});

test('status uses standard Lucide icons while preserving 10+13 attribute formulas and account safety', () => {
  assert.ok(status.includes("import SidebarIcon from '../components/SidebarIcon'"));
  assert.ok(status.includes("import '../styles/status-v4.css'"));
  assert.ok(status.includes('kuro-status-v4'));
  assert.ok(status.includes('BASIC_ATTRIBUTES.map'));
  assert.ok(status.includes('derivedAttributes.map'));
  assert.ok(status.includes('getStatusAccountRows(player)'));
  assert.ok(status.includes("supabase.rpc('atualizar_titulo_jogador'"));
  assert.ok(status.includes('<SidebarIcon name={icon} size={19} />'));
  assert.ok(!status.includes('icon="🦊"'));
  const css = read('src/styles/status-v4.css');
  assert.ok(css.includes('var(--kuro-gold)'));
  assert.ok(css.includes('@media (max-width: 680px)'));
});

test('roster preserves the public-only sources and read-only individual combat', () => {
  assert.ok(opponents.includes("import SidebarIcon from '../components/SidebarIcon'"));
  assert.ok(opponents.includes("import GameAction from '../components/ui/GameAction'"));
  assert.ok(opponents.includes("supabase.from('characters')"));
  assert.ok(opponents.includes("supabase.from('npcs')"));
  assert.ok(opponents.includes("supabase.rpc('listar_perfis_ninja'"));
  assert.ok(opponents.includes('Combate individual indisponível'));
  assert.ok(opponents.includes('Projeções são representações públicas, não PvP ao vivo'));
  assert.ok(!opponents.includes('<Swords'));
  assert.equal((opponents.match(/<GameAction\\b/g) || []).length, (opponents.match(/<\\/GameAction>/g) || []).length);
  for (const name of ['arrowLeft','arrowRight','compass','swords','shield','users','search','info','refresh','lock']) {
    assert.ok(icons.includes(name + ':'), 'Icon registry missing ' + name);
  }
  assert.ok(opponentCss.includes('var(--kuro-gold'));
  assert.ok(opponentCss.includes('var(--kuro-line'));
});
