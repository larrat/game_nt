import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = name => readFileSync(new URL('../src/pages/' + name + '.jsx', import.meta.url), 'utf8');
const sheet = path => readFileSync(new URL('../src/styles/' + path, import.meta.url), 'utf8');
const groups = {
  'world-services-v4.css': ['Vila','Templo','Ferreiro'],
  'challenges-v4.css': ['Invocacoes','Portoes','Exame','Evento','Ranking','Historico','Vip','Clas'],
  'auth-polish-v4.css': ['Login','RedefinirSenha','Selecionar','Criar'],
};
const serverRpcs = {
  Vila:['doar_vila'],Templo:['desbloquear_avatar_templo'],Ferreiro:['aprimorar_equipamento'],
  Invocacoes:['assinar_invocacao','equipar_invocacao'],Portoes:['abrir_portao'],
  Exame:['iniciar_exame_chunin'],Evento:['iniciar_world_boss'],
  Ranking:['listar_perfis_ninja'],
  Clas:['entrar_cla','treinar_cla','aprender_kinjutsu'],
  Selecionar:['excluir_personagem'],Criar:['criar_personagem'],
};

test('all 15 remaining screen routes have v4 wrappers and their expected shared styles', () => {
  const all=Object.values(groups).flat();
  assert.equal(all.length,15);
  assert.equal(new Set(all).size,15);
  for(const [style,pages] of Object.entries(groups)) {
    assert.ok(sheet(style).includes('--kuro-')||sheet(style).includes('var(--kuro-'));
    for(const page of pages) {
      const source=load(page);
      assert.ok(source.includes("import '../styles/"+style+"';"),page+' shared styling missing');
      assert.ok(source.includes('-v4'),page+' wrapper missing');
      const opens=(source.match(/<GameAction\b/g)||[]).length;
      const closes=(source.match(/<\/GameAction>/g)||[]).length;
      assert.equal(opens,closes,page+' button tags unbalanced');
    }
  }
});
test('authoritative domain actions remain in their page modules',()=>{
  for(const [page,rpcs] of Object.entries(serverRpcs)) {
    const source=load(page);
    for(const rpc of rpcs)assert.ok(source.includes("rpc('"+rpc+"'"),page+' missing RPC '+rpc);
  }
});
test('unsupported VIP economic actions remain visibly disabled', () => {
  const source = load('Vip');
  assert.match(source, /useState\(false\)/);
  assert.ok(source.includes("'vip_point_respec_enabled'"));
  assert.match(source, /disabled={!vipResetAvailable}/);
  assert.ok(!source.includes("rpc('vip_reset_personagem'"));
});
test('critical keyboard and state paths are maintained in the revised screens',()=>{
  const village=load('Vila'), forge=load('Ferreiro'), summons=load('Invocacoes');
  const clans=load('Clas'), rank=load('Ranking'), history=load('Historico');
  const hospitalSource=readFileSync(new URL('../src/pages/Hospital.jsx', import.meta.url),'utf8');
  assert.ok(village.includes('aria-label={`Visitar '));
  assert.ok(village.includes('kuro-village-v4__building'));
  assert.ok(forge.includes('aria-pressed={selectedItem?.id === item.id}'));
  assert.ok(forge.includes('<ItemArtwork name={item.items.name}'));
  assert.ok(summons.includes('role="tablist"'));
  assert.ok(summons.includes("aria-selected={activeTab === 'meus'}"));
  assert.ok(clans.includes('aria-pressed={idx === selectedClanIdx}'));
  assert.ok(rank.includes('kuro-ranking-v4__scroll'));
  assert.ok(rank.includes('aria-pressed={filter ==='));
  assert.ok(history.includes('aria-pressed={selectedLog?.id === log.id}'));
  assert.ok(hospitalSource.includes("rpc('hospital_alta'"));
});
test('auth pages retain their existing recovery and creation implementations',()=>{
  const login=load('Login'), recovery=load('RedefinirSenha');
  const selection=load('Selecionar'), creation=load('Criar');
  assert.ok(login.includes('handleSubmit'));
  assert.ok(login.includes('signInWithPassword'));
  assert.ok(recovery.includes('updateUser'));
  assert.ok(selection.includes('handleSelect'));
  assert.ok(creation.includes('canCreateCharacter'));
  assert.ok(creation.includes('MAX_CHARACTERS_PER_ACCOUNT'));
});
