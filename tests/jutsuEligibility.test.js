import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getJutsuEligibility, getJutsuMasteryStat, getJutsuRankIndex,
  jutsuCatalogTabs, filterJutsuCatalog, selectBulkJutsus, toJutsuId
} from '../src/utils/jutsuEligibility.js';

const student = {
  level: 1, rank: 'Estudante da Academia', class: 'NIN', clan: 'Uchiha',
  element: 'Katon', ninjutsu: 10, taijutsu: 1, genjutsu: 0,
  bukijutsu: 0, selo: 5, ryous: 1000
};
const basic = { id: 1, category: 'Ninjutsu', req_level: 1, req_rank: 'Estudante da Academia',
  req_attr_value: 0, req_seals: 5, cost_ryous: 100 };

test('aprendizado inicial não pressupõe Genin e considera custo confirmado no catálogo', () => {
  const s = getJutsuEligibility(basic, student);
  assert.equal(s.eligible, true);
  assert.equal(s.cost, 100);
  assert.equal(getJutsuEligibility({ ...basic, req_rank: null }, student).eligible, true);
  assert.deepEqual(getJutsuEligibility(basic, { ...student, ryous: 99 }).reasons, ['RY$ 100']);
});

test('requisitos de selo e domínio são simultâneos, sem deixar selo passar despercebido', () => {
  const j = { ...basic, req_attr_value: 7, req_seals: 6 };
  assert.deepEqual(getJutsuEligibility(j, student).reasons, ['6 em selo']);
  assert.deepEqual(getJutsuEligibility(j, { ...student, ninjutsu: 6 }).reasons,
    ['7 em ninjutsu', '6 em selo']);
  assert.equal(getJutsuEligibility(j, { ...student, selo: 6 }).eligible, true);
});

test('clã, classe, elemento e graduação reproduzem as restrições atuais do servidor', () => {
  const j = { ...basic, req_class: 'NIN', req_clan: 'Uchiha', element: 'Katon' };
  assert.equal(getJutsuEligibility(j, student).eligible, true);
  assert.deepEqual(getJutsuEligibility(j, { ...student, class: 'TAI', clan: 'Nara', element: 'Suiton' }).reasons,
    ['Classe NIN', 'Clã Uchiha', 'Elemento Katon']);
  assert.equal(getJutsuEligibility({ ...j, req_class: 'Todos' }, student).eligible, true);
  assert.equal(getJutsuEligibility({ ...j, req_rank: 'Chunin' }, student).eligible, false);
  assert.equal(getJutsuEligibility({ ...j, req_rank: 'graduação desconhecida' }, student).eligible, false);
  assert.equal(getJutsuRankIndex('Sannin Lendário'), 5);
  assert.equal(getJutsuRankIndex('Herói Mundial'), 6);
});

test('Fuinjutsu usa ninjutsu para domínio, como a RPC atual', () => {
  assert.equal(getJutsuMasteryStat('Fuinjutsu'), 'ninjutsu');
  assert.equal(getJutsuMasteryStat('Taijutsu'), 'taijutsu');
  assert.equal(getJutsuEligibility({ ...basic, category: 'Fuinjutsu', req_attr_value: 8 }, student).eligible, true);
});

test('filtros incluem Fuinjutsu e mostram elementais de qualquer afinidade para consulta', () => {
  const rows = [
    { id: 1, category: 'Fuinjutsu' },
    { id: 2, category: 'Ninjutsu', element: 'Suiton' },
    { id: 3, category: 'Ninjutsu', element: 'Katon' }
  ];
  assert.deepEqual(jutsuCatalogTabs(rows), ['Todos','Fuinjutsu','Ninjutsu','Elementares']);
  assert.equal(filterJutsuCatalog(rows, 'Elementares').length, 2);
  assert.equal(filterJutsuCatalog(rows, 'Fuinjutsu').length, 1);
  assert.equal(toJutsuId({ id: 15 }), '15');
});

test('VIP usa elegibilidade da compra individual, evita duplicidades e respeita limite de 50', () => {
  const rows = Array.from({ length: 52 }, (_, i) => ({ ...basic, id: i + 1 }));
  rows[50] = { ...rows[50], req_clan: 'Senju' };
  let bulk = selectBulkJutsus(rows, { ...student, ryous: 100000 }, new Set(['1']), 50);
  assert.equal(bulk.selected.length, 50);
  assert.equal(bulk.totalCost, 5000);
  assert.equal(bulk.remaining, 0);
  assert.equal(bulk.selected.some(j => j.id === 1), false);
  assert.equal(bulk.selected.some(j => j.id === 51), false);
  assert.equal(getJutsuEligibility(basic, student, true).eligible, false);
});
