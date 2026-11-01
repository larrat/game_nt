import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Raid opens server-authorized session before charging 25 stamina per started fight',()=>{
 const sql=read('migrations/071_verified_raid_and_vip_point_respec.sql');
 assert.equal((sql.match(/public\.iniciar_combate_sessao\(/g)||[]).length,2);
 assert.equal((sql.match(/SET player_stamina=v_current.*-v_cost/g)||[]).length,2);
 assert.match(sql,/CREATE UNIQUE INDEX IF NOT EXISTS raid_runs_one_active_per_player/);
 assert.match(sql,/UPDATE public\.players SET stamina=v_current_stamina-v_cost/);
 assert.match(sql,/UPDATE public\.players SET stamina=v_current-v_cost/);
 assert.match(sql,/v_session\.status<>'settled'/);
 assert.match(sql,/v_session\.status='active'/);
 assert.match(sql,/v_session\.status='defeated'/);
 assert.match(sql,/v_raid\.stamina_spent\+v_cost/);
 assert.doesNotMatch(sql,/DELETE FROM public\.players/);
});

test('New Raid and VIP actions are guarded by false server flags on creation',()=>{
 const sql=read('migrations/071_verified_raid_and_vip_point_respec.sql');
 assert.ok(sql.includes("'verified_raids_enabled','false'::jsonb"));
 assert.ok(sql.includes("'vip_point_respec_enabled','false'::jsonb"));
 assert.ok(sql.includes("Raids aguardam homologação"));
 assert.ok(sql.includes("Respec VIP aguarda homologação"));
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.reservar_raid_stamina\(integer,integer\)/);
 assert.match(sql,/ON app_private\.raid_runs/);
 assert.match(sql,/ON app_private\.vip_point_respec_ledger/);
});

test('VIP credit, attribute refund and immutable audit happen in one SQL function',()=>{
 const sql=read('migrations/071_verified_raid_and_vip_point_respec.sql');
 assert.match(sql,/public\.vip_reset_talento\(p_player_id integer,p_atributo text\)/);
 assert.match(sql,/WHERE id=p_player_id AND user_id=auth\.uid\(\) FOR UPDATE/);
 assert.match(sql,/v_old,0\)<=v_base/);
 assert.match(sql,/vip_coins=vip_coins-1,total_vip_spent=total_vip_spent\+1/);
 assert.match(sql,/INSERT INTO app_private\.vip_point_respec_ledger/);
 assert.match(sql,/pontos_atributos=COALESCE\(pontos_atributos,0\)\+1/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.vip_reset_talento\(integer,text\)/);
});

test('Dojo and VIP UI only expose server-reviewed actions',()=>{
 const dojo=read('src/pages/Dojo.jsx');
 const vip=read('src/pages/Vip.jsx');
 assert.ok(dojo.includes("'verified_raids_enabled'"));
 assert.ok(dojo.includes("'iniciar_raid_verificada'"));
 assert.ok(dojo.includes("'continuar_raid_verificada'"));
 assert.ok(dojo.includes('disabled={raidUnavailable || raidState?.active}'));
 assert.ok(!dojo.includes("rpc('reservar_raid_stamina'"));
 assert.ok(vip.includes("'vip_point_respec_enabled'"));
 assert.ok(vip.includes("'vip_reset_talento'"));
 assert.ok(vip.includes('disabled={!vipResetAvailable || busy || vipCredits < 1}'));
 assert.ok(!vip.includes("rpc('vip_reset_personagem'"));
});

test('Art records are private and must have explicit license documentation to approve',()=>{
 const sql=read('migrations/072_art_rights_approval_gate.sql');
 assert.ok(sql.includes("review_status text NOT NULL DEFAULT 'pending_rights'"));
 assert.ok(sql.includes("license_document_ref"));
 assert.ok(sql.includes("rights_holder"));
 assert.ok(sql.includes("permitted_scope"));
 assert.ok(sql.includes("approved_local_path LIKE '/images/%'"));
 assert.ok(sql.includes('ALTER TABLE content_reference.art_rights_reviews ENABLE ROW LEVEL SECURITY'));
 assert.ok(!sql.includes("SET gameplay_enabled=true"));
 assert.ok(!sql.includes("UPDATE public.characters"));
});
test('Staging QA script cannot operate against production, requires two independent accounts',()=>{
 const script=read('scripts/qa-two-account-staging.mjs');
 assert.ok(script.includes("ref === 'gvtbixbyqayhdwowgqrp'"));
 assert.ok(script.includes("QA_MUTATIONS_APPROVED !== 'YES_STAGING_ONLY'"));
 assert.ok(script.includes('assert.notEqual(idA,idB'));
 assert.ok(script.includes("p_player_id:oneB.id"));
 assert.ok(script.includes("QA_A_EMAIL") && script.includes("QA_B_EMAIL"));
});
