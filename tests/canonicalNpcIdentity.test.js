import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateDynamicRogueNinja } from '../src/utils/engine.js';

const player = {
  id: 1, level: 8, forca: 8, agilidade: 8, resistencia: 8,
  inteligencia: 8, energia: 8, ninjutsu: 8, taijutsu: 8,
  genjutsu: 8, bukijutsu: 8, selo: 8
};

test('encontro dinamico exige NPC realmente vinculado ao catalogo', () => {
  assert.equal(generateDynamicRogueNinja(player), null);
  assert.equal(generateDynamicRogueNinja(player, 0, { id: 17, name: 'Temari' }), null);
  assert.equal(generateDynamicRogueNinja(player, 0, {
    id: 17, character_id: 'ng-initial-47', name: 'Temari', is_active: false
  }), null);
  assert.equal(generateDynamicRogueNinja(player, 0, {
    id: 49, character_id: 'ng-initial-62', name: 'Shikamaru Nara',
    is_chunin_exam: true
  }), null);
});

test('encontro ajusta atributos sem fabricar nome ou clã', () => {
  const source = {
    id: 17, character_id: 'ng-initial-47', name: 'Temari',
    avatar: '🥷', level: 8, rank: 'Genin', element: 'Futon', is_active: true
  };
  const enemy = generateDynamicRogueNinja(player, 2, source);
  assert.equal(enemy.name, source.name);
  assert.equal(enemy.character_id, source.character_id);
  assert.equal(enemy.npc_source_id, source.id);
  assert.equal(enemy.avatar, null);
  assert.equal(enemy.clan, null);
  assert.equal(enemy.summon, null);
  assert.ok(enemy.level >= player.level);
  assert.ok(enemy.hp > 0);
});

test('fluxos mapa dojo e exame usam identidade do catalogo', () => {
  const dojo = readFileSync('src/pages/Dojo.jsx', 'utf8');
  const map = readFileSync('src/pages/Mapa.jsx', 'utf8');
  const exam = readFileSync('src/pages/Exame.jsx', 'utf8');
  const migration = readFileSync('migrations/065_link_npcs_to_canonical_characters.sql', 'utf8');
  assert.ok(dojo.includes('loadCanonicalDojoNpcs'));
  assert.ok(dojo.includes('isMirror: false'));
  assert.ok(map.includes('template.name'));
  assert.ok(map.includes('isMirror: false, fromMap: true'));
  assert.ok(!dojo.includes('generateDynamicRogueNinja('));
  assert.ok(!map.includes('generateDynamicRogueNinja('));
  assert.ok(!dojo.includes("rpc('reservar_raid_stamina'"));
  assert.match(exam, /npcRecord\?\.avatar \|\| null/);
  assert.doesNotMatch(exam, /avatar: round === 1 \? '🥷'/);
  assert.match(migration, /ALTER TABLE public\.npcs ALTER COLUMN character_id SET NOT NULL/);
  assert.match(migration, /REFERENCES public\.characters\(id\)/);
});
