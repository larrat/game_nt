// Run only in a dedicated Supabase staging project with TWO disposable test accounts.
// npm run qa:staging
// This file never uses a service-role key, never prints passwords, and refuses production.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const required = [
  'QA_STAGING_PROJECT_REF','QA_SUPABASE_URL','QA_SUPABASE_PUBLISHABLE_KEY',
  'QA_A_EMAIL','QA_A_PASSWORD','QA_B_EMAIL','QA_B_PASSWORD'
];
for (const name of required) {
  if (!process.env[name]) throw new Error('Missing staging-only variable '+name);
}
const ref = process.env.QA_STAGING_PROJECT_REF;
const url = new URL(process.env.QA_SUPABASE_URL);
if (ref === 'gvtbixbyqayhdwowgqrp' ||
    !url.hostname.startsWith(ref + '.') ||
    process.env.QA_MUTATIONS_APPROVED !== 'YES_STAGING_ONLY' ||
    process.env.QA_A_EMAIL === process.env.QA_B_EMAIL) {
  throw new Error('Refusing test mutations without an isolated staging project, two distinct accounts and explicit QA approval.');
}
const newClient = () => createClient(process.env.QA_SUPABASE_URL,
  process.env.QA_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
const a = newClient();
const b = newClient();
async function signIn(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data?.user?.id) throw new Error('Staging account authentication failed');
  return data.user.id;
}
async function queryOwn(client) {
  const { data, error } = await client.from('players')
    .select('id,user_id,level,ryous,stamina,vip_coins,pontos_atributos,forca')
    .order('id');
  if (error) throw error;
  return data || [];
}
async function createTestCharacter(client, label) {
  const chars = await client.from('characters').select('id').order('id').limit(1);
  const villages = await client.from('villages').select('id').neq('id',8).order('id').limit(1);
  if (chars.error || villages.error || !chars.data?.length || !villages.data?.length) {
    throw new Error('Staging character or village seed missing');
  }
  const base = chars.data[0].id;
  const avatar = await client.from('avatars').select('id').eq('character_id',base).limit(1);
  if (avatar.error) throw avatar.error;
  const suffix = Date.now().toString(36);
  const { data, error } = await client.rpc('criar_personagem', {
    p_name:'QATest'+label+suffix,
    p_village_id:villages.data[0].id,
    p_character_id:base,
    p_avatar:avatar.data?.[0]?.id ?? '',
    p_class:'NIN'
  });
  if (error || !data?.success) throw new Error('Could not create staging-only ninja');
  return data.player;
}
async function main() {
  const idA = await signIn(a, process.env.QA_A_EMAIL, process.env.QA_A_PASSWORD);
  const idB = await signIn(b, process.env.QA_B_EMAIL, process.env.QA_B_PASSWORD);
  assert.notEqual(idA,idB,'Accounts must be different');
  let pa = await queryOwn(a);
  let pb = await queryOwn(b);
  for (const p of pa) assert.equal(p.user_id,idA);
  for (const p of pb) assert.equal(p.user_id,idB);
  if (!pa.length) await createTestCharacter(a,'A');
  if (!pb.length) await createTestCharacter(b,'B');
  pa=await queryOwn(a);pb=await queryOwn(b);
  const oneA=pa[0],oneB=pb[0];
  assert.equal(oneA.user_id,idA);assert.equal(oneB.user_id,idB);
  const targetA=await a.from('players').select('id').eq('id',oneB.id);
  const targetB=await b.from('players').select('id').eq('id',oneA.id);
  assert.deepEqual(targetA.data||[],[],'A must not see B');
  assert.deepEqual(targetB.data||[],[],'B must not see A');
  const beforeB=await b.from('players').select('ryous,stamina,vip_coins,pontos_atributos').eq('id',oneB.id).single();
  const attempt=await a.rpc('treinar_atributos',{
    p_player_id:oneB.id,p_atributo:'forca',p_quantidade:1
  });
  assert.ok(attempt.error || attempt.data?.success===false,'Other account training must be refused');
  const afterB=await b.from('players').select('ryous,stamina,vip_coins,pontos_atributos').eq('id',oneB.id).single();
  assert.deepEqual(afterB.data,beforeB.data,'B resources must remain unchanged');

  const mine=await a.rpc('treinar_atributos',{
    p_player_id:oneA.id,p_atributo:'forca',p_quantidade:1
  });
  assert.ok(!mine.error && mine.data?.success,'Official training must work in staging');
  const trained=await a.from('players').select('forca,pontos_atributos').eq('id',oneA.id).single();
  assert.ok(trained.data.forca>oneA.forca);
  assert.equal(trained.data.pontos_atributos,oneA.pontos_atributos-1);

  // Negative tests for pre-release features: no charge without server enablement.
  const startRaid=await a.rpc('iniciar_raid_verificada',{p_player_id:oneA.id,p_fight_count:3});
  assert.ok(startRaid.error || startRaid.data?.success===false,
    'Raids must be disabled until deliberate positive-test activation');
  const vip=await a.rpc('vip_reset_talento',{p_player_id:oneA.id,p_atributo:'forca'});
  assert.ok(vip.error || vip.data?.success===false,
    'VIP must be disabled until deliberate positive-test activation');

  const remain=await a.from('players').select('vip_coins').eq('id',oneA.id).single();
  assert.equal(remain.data.vip_coins,oneA.vip_coins);
  const ranking=await a.rpc('listar_perfis_ninja',{p_limit:50});
  assert.equal(ranking.error,null,'Public projection ranking must continue working');
  console.log('STAGING PASS: independent A/B auth, private RLS, forbidden cross-account training, valid own training, gated Raids/VIP, ranking');
  console.log('NOT TESTED: email delivery, real PvE win, raid completion, VIP debit; these require staging setup and deliberate feature enablement.');
  await a.auth.signOut();await b.auth.signOut();
}
main().catch(error=>{console.error('STAGING QA FAILURE:',error.message);process.exitCode=1;});
