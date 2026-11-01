import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file = name => readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('players SELECT is owned by account and UPDATE cannot reassign owner', () => {
 const sql=file('migrations/069_private_player_read_policy_20261101.sql');
 assert.match(sql,/ALTER POLICY players_select_authenticated ON public\.players[\s\S]*?USING \(user_id = \(SELECT auth\.uid\(\)\)\)/);
 assert.match(sql,/ALTER POLICY players_update_own ON public\.players[\s\S]*?WITH CHECK \(user_id = \(SELECT auth\.uid\(\)\)\)/);
 assert.match(sql,/player_policy_backup_20261101/);
 assert.doesNotMatch(sql,/DELETE FROM public\.players|TRUNCATE public\.players/);
});

test('direct player reads scope own account; cross-account discovery is curated RPC',()=>{
 const app=file('src/App.jsx');
 const selection=file('src/pages/Selecionar.jsx');
 const creation=file('src/pages/Criar.jsx');
 const exam=file('src/pages/Exame.jsx');
 const ranking=file('src/pages/Ranking.jsx');
 assert.match(app,/\.eq\('user_id', session\.user\.id\)/);
 assert.match(selection,/\.eq\('user_id', session\.user\.id\)/);
 assert.match(creation,/\.eq\('user_id', session\.user\.id\)/);
 assert.match(exam,/\.eq\('id', player\.id\)/);
 assert.match(ranking,/rpc\('listar_perfis_ninja'/);
});
