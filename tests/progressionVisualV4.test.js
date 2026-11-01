import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

const pages = Object.freeze({
  Treino: ['kuro-training-v4', "rpc('treinar_atributos'", 'kuro-progression-v4__metrics'],
  Tecnicas: ['kuro-techniques-v4', "rpc('aprender_jutsu'", "rpc('aprender_jutsus_massa'", 'kuro-techniques-v4__category'],
  Elementos: ['kuro-elements-v4', "rpc('aprender_elemento'", 'aria-pressed={selectedNode?.id === el.id}'],
  Graduacoes: ['kuro-ranks-v4', "rpc('promover_graduacao'", 'kuro-ranks-v4__requirements'],
  AprimorarJutsus: ['kuro-enhance-v4', "rpc('modificar_jutsu_slots'", 'kuro-enhance-v4__essence'],
});

test('all five progression modules import the same Kurokage v4 styling without replacing authoritative RPCs', () => {
  for (const [page, expected] of Object.entries(pages)) {
    const src = read('src/pages/' + page + '.jsx');
    assert.ok(src.includes("import '../styles/academy-progression-v4.css';"), page + ' must load shared visual styles');
    for (const fragment of expected) assert.ok(src.includes(fragment), page + ' missing ' + fragment);
    assert.ok(src.includes("import SidebarIcon from '../components/SidebarIcon';"), page + ' should use shared icon registry');
  }
  const css = read('src/styles/academy-progression-v4.css');
  for (const name of ['kuro-training-v4','kuro-techniques-v4','kuro-elements-v4','kuro-ranks-v4','kuro-enhance-v4']) {
    assert.ok(css.includes('.' + name));
  }
  assert.ok(css.includes('var(--kuro-gold)'));
  assert.ok(css.includes(':focus-visible'));
  assert.ok(css.includes('@media(max-width:640px)'));
});

test('training simulator and technical academy keep confirmations and safety state', () => {
  const train = read('src/pages/Treino.jsx');
  const tech = read('src/pages/Tecnicas.jsx');
  assert.ok(train.includes("onClick={handleTrain}"));
  assert.ok(train.includes("disabled={maxQuantity === 0}"));
  assert.ok(train.includes("formatTrainingReceipt"));
  assert.ok(tech.includes("onClick={handleBulkPreview}"));
  assert.ok(tech.includes("onClick={handleBulkLearn}"));
  assert.ok(tech.includes("aria-modal=\"true\""));
  assert.ok(tech.includes("getJutsuEligibility"));
  assert.ok(tech.includes("aria-pressed={cat === filterCat}"));
});

test('elements, ranks and jutsu enhancement are keyboard operable with unchanged server authority', () => {
  const elements = read('src/pages/Elementos.jsx');
  const ranks = read('src/pages/Graduacoes.jsx');
  const upgrade = read('src/pages/AprimorarJutsus.jsx');
  assert.ok(elements.includes('<button\n                  type="button"\n                  key={el.id}'));
  assert.ok(elements.includes('disabled={!canLearn}'));
  assert.ok(elements.includes('onClick={() => handleLearnElement(displayElement.id)}'));
  assert.ok(ranks.includes('<details className="kuro-ranks-v4__requirements">'));
  assert.ok(ranks.includes('disabled={!canGrad}'));
  assert.ok(ranks.includes('onClick={() => graduarPara(rank.id)}'));
  assert.ok(upgrade.includes('aria-pressed={isSelected}'));
  assert.ok(upgrade.includes('disabled={!slotted || loading}'));
  assert.ok(upgrade.includes('onClick={() => removeEssence(idx)}'));
  assert.ok(upgrade.includes('onClick={upgradeJutsuLevel}'));
  assert.ok(upgrade.includes('onClick={() => {\n                           const emptySlotIndex'));
});
