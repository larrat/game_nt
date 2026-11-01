import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path,import.meta.url),'utf8');

test('A3: verified battles do not tick or autoattack before server confirmation',()=>{
  const combat=read('src/pages/Combate.jsx');
  assert.ok(combat.includes('(!combatSessionEligible || (!combatSessionLoading && !combatSessionFailed && Boolean(combatSessionId)))'));
  assert.ok(combat.includes('combatSessionEligible, combatSessionId, combatSessionLoading, combatSessionFailed'));
  assert.ok(combat.includes('disabled={!isPlayerTurn || blockedByServer || loading}'));
});
test('A1/A8: dummy training never fakes a faint or 50/1 chakra',()=>{
  const combat=read('src/pages/Combate.jsx');
  const fighter=read('src/components/CombatFighterCard.jsx');
  assert.ok(combat.includes("setBattleResult('training_end')"));
  assert.ok(combat.includes("battleResult === 'training_end' ? '/dojo' : '/hospital'"));
  assert.ok(combat.includes('Number(npcInit?.chakra ?? 0)'));
  assert.ok(fighter.includes('{maxCp > 0 && <StatBar label="Chakra"'));
});
test('A2: selection background does not expand the viewport',()=>{
  const style=read('src/styles/character-selection.css');
  assert.ok(style.includes('overflow-x: clip'));
  assert.ok(style.includes('white-space: normal'));
  assert.ok(style.includes('width: calc(100% - 24px)'));
});
test('A4/A6: catalogues distinguish error, empty, retry, and affordability',()=>{
  for(const name of ['Clas','Graduacoes','Ichiraku']){
    const page=read('src/pages/'+name+'.jsx');
    assert.ok(page.includes('catalogError'),name);
    assert.ok(page.includes('Tentar novamente'),name);
    assert.ok(page.includes('catalogLoading')||page.includes('loading ? ('),name);
  }
  const shop=read('src/pages/Ichiraku.jsx');
  assert.ok(shop.includes("'Saldo insuficiente'"));
  assert.ok(shop.includes('disabled={buyingId !== null'));
});
test('A5: optional server rows never use single() on absence',()=>{
  const combat=read('src/pages/Combate.jsx');
  assert.ok(combat.includes('.maybeSingle()'));
  assert.ok(combat.includes(".from('player_summons')"));
  assert.ok(combat.includes(".from('global_events')"));
  assert.ok(!combat.includes(".eq('is_equipped', true)\n        .single()"));
});
test('A7/A9: season labels have single source and route failures recover',()=>{
  const season=read('src/utils/season.js');
  assert.ok(season.includes("CURRENT_SEASON_ROMAN = 'I'"));
  for(const path of ['src/pages/Ranking.jsx','src/pages/Dashboard.jsx','src/components/Sidebar.jsx'])
    assert.ok(read(path).includes('CURRENT_SEASON_LABEL'),path);
  const app=read('src/App.jsx');
  assert.equal((app.match(/<RouteErrorBoundary><Suspense /g)||[]).length,5);
  const boundary=read('src/components/RouteErrorBoundary.jsx');
  assert.ok(boundary.includes('getDerivedStateFromError'));
  assert.ok(boundary.includes('window.location.reload()'));
});
