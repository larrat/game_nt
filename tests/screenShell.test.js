import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCREEN_NAV, findScreenGroup } from '../src/utils/screenNavigation.js';

const routes = SCREEN_NAV.flatMap(group => group.items.map(item => item.to));
const expected = [
  '/dashboard','/status','/equipamentos','/tecnicas','/aprimorar-jutsus',
  '/treino','/tarefas','/graduacoes','/exame','/historia',
  '/mapa','/vila','/dojo','/evento','/ranking','/historico','/clas',
  '/invocacoes','/elementos','/portoes','/templo','/hospital',
  '/ferreiro','/ichiraku','/vip'
];
test('menu acessa todas as 25 telas autenticadas, sem duplicações', () => {
  assert.deepEqual([...routes].sort(), [...expected].sort());
  assert.equal(new Set(routes).size, routes.length);
});
test('grupos de navegação usam a estrutura de telas documentadas', () => {
  assert.equal(findScreenGroup('/treino'), 'academia');
  assert.equal(findScreenGroup('/tecnicas'), 'academia');
  assert.equal(findScreenGroup('/dojo'), 'combates');
  assert.equal(findScreenGroup('/status'), 'personagem');
  assert.equal(findScreenGroup('/hospital'), 'vila');
  assert.equal(findScreenGroup('/vip'), 'premium');
  assert.equal(findScreenGroup('/rota-inexistente'), null);
  assert.equal(SCREEN_NAV.find(group => group.id === 'academia').items.length, 6);
});
test('barra de recursos exibe valores e usa progresso sem inline CSS', () => {
  const topBar = readFileSync(new URL('../src/components/TopBar.jsx', import.meta.url), 'utf8');
  assert.match(topBar, /kuro-rpg-topbar__resources/);
  assert.match(topBar, /<progress/);
  assert.match(topBar, /aria-valuetext=/);
  assert.match(topBar, /resource\.current/);
  assert.match(topBar, /resource\.max/);
  assert.doesNotMatch(topBar, /style=\{\{/);
});
test('menu usa botões de grupo e se mantém legível em telas pequenas', () => {
  const sidebar = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/styles/rpg-shell.css', import.meta.url), 'utf8');
  assert.match(sidebar, /aria-expanded=\{open\}/);
  assert.match(sidebar, /aria-controls=/);
  assert.match(sidebar, /<nav /);
  assert.match(sidebar, /player\.rank/);
  assert.match(css, /@media \(max-width: 980px\)/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /prefers-reduced-motion/);
});
