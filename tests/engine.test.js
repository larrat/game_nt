import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateXPForLevel,
  calculateLevelFromXP,
  calculateVillageXPForLevel,
  calculateVillageLevelFromXP,
  calculateHP,
  calculateChakra,
  calculateStamina,
  calculateCritChance,
  calculateDodgeChance,
  calculateChakraDiscount,
  getEquipmentBonus,
  normalizeBonusStats,
  getElementalMultiplier,
  getRankBonus,
  rankValue,
} from '../src/utils/engine.js';

test('curva de XP do personagem preserva os limiares documentados no motor', () => {
  assert.equal(calculateXPForLevel(0), 0);
  assert.equal(calculateXPForLevel(1), 0);
  assert.equal(calculateXPForLevel(2), 1741);
  assert.equal(calculateXPForLevel(3), 3612);
  assert.equal(calculateXPForLevel(4), 6062);

  assert.equal(calculateLevelFromXP(0), 1);
  assert.equal(calculateLevelFromXP(1740), 1);
  assert.equal(calculateLevelFromXP(1741), 2);
  assert.equal(calculateLevelFromXP(3611), 2);
  assert.equal(calculateLevelFromXP(3612), 3);
});

test('curva de XP da vila preserva os limiares documentados no motor', () => {
  assert.equal(calculateVillageXPForLevel(1), 0);
  assert.equal(calculateVillageXPForLevel(2), 5656);
  assert.equal(calculateVillageXPForLevel(3), 10392);
  assert.equal(calculateVillageLevelFromXP(5655), 1);
  assert.equal(calculateVillageLevelFromXP(5656), 2);
  assert.equal(calculateVillageLevelFromXP(10392), 3);
});

test('bônus de graduação permanecem compatíveis com a tabela atual', () => {
  assert.deepEqual(getRankBonus('Estudante da Academia'), {
    hp: 0, chakra: 0, stamina: 0,
  });
  assert.deepEqual(getRankBonus('Genin'), {
    hp: 150, chakra: 150, stamina: 150,
  });
  assert.deepEqual(getRankBonus('Herói'), {
    hp: 2500, chakra: 2000, stamina: 2000,
  });
  assert.deepEqual(getRankBonus('graduação desconhecida'), {
    hp: 0, chakra: 0, stamina: 0,
  });
});

test('graduações avançadas usam os mesmos bônus com título, id e nome alternativo', () => {
  const cases = [
    [['Jonin', 'Jounin', 'jonin'], { hp: 600, chakra: 500, stamina: 500 }, 3],
    [['Sannin', 'Sannin Lendário', 'sannin'], { hp: 1500, chakra: 1200, stamina: 1200 }, 5],
    [['Herói', 'Herói Mundial', 'heroi'], { hp: 2500, chakra: 2000, stamina: 2000 }, 6],
    [['Estudante da Academia', 'estudante'], { hp: 0, chakra: 0, stamina: 0 }, 0],
    [['Genin', 'genin'], { hp: 150, chakra: 150, stamina: 150 }, 1],
    [['Chunin', 'chunin'], { hp: 350, chakra: 300, stamina: 300 }, 2],
    [['ANBU', 'anbu'], { hp: 1000, chakra: 800, stamina: 800 }, 4]
  ];
  for (const [aliases, expectedBonus, expectedRank] of cases) {
    for (const label of aliases) {
      assert.deepEqual(getRankBonus(label), expectedBonus, label);
      assert.equal(rankValue(label), expectedRank, label);
    }
  }
  assert.equal(rankValue('graduação inválida'), 0);
});

test('personagens com rank Jonin ou superior recebem bônus de HP, chakra e stamina', () => {
  const novice = {
    level: 1, rank: 'estudante', resistencia: 0, energia: 0,
    ninjutsu: 0, genjutsu: 0, taijutsu: 0, bukijutsu: 0,
    equipped_items: []
  };
  for (const [rank, hpBonus, chakraBonus, staminaBonus] of [
    ['Jonin', 600, 500, 500],
    ['Sannin Lendário', 1500, 1200, 1200],
    ['Herói Mundial', 2500, 2000, 2000]
  ]) {
    const promoted = { ...novice, rank };
    assert.equal(calculateHP(promoted) - calculateHP(novice), hpBonus);
    assert.equal(calculateChakra(promoted) - calculateChakra(novice), chakraBonus);
    assert.equal(calculateStamina(promoted) - calculateStamina(novice), staminaBonus);
  }
});

test('normalização de bônus de equipamento mapeia chaves conhecidas', () => {
  assert.deepEqual(normalizeBonusStats({
    HP: '20%',
    Chakra: '25',
    'Ataque Tai/Buk': '12',
    'valor inválido': 'não numérico',
  }), {
    hp: 20,
    chakra: 25,
    tai: 12,
  });
});

test('bônus de equipamento considera o nível de aprimoramento', () => {
  const player = {
    equipped_items: [{
      bonus_stats: { HP: 20, Chakra: 25 },
      upgrade_level: 1,
    }],
  };
  assert.equal(getEquipmentBonus(player, 'hp'), 24);
  assert.equal(getEquipmentBonus(player, 'chakra'), 30);
  assert.equal(getEquipmentBonus(null, 'hp'), 0);
  assert.equal(getEquipmentBonus({ equipped_items: [] }, 'hp'), 0);
});

test('HP máximo inclui atributos, graduação, equipamento e multiplicador do clã', () => {
  const player = {
    level: 5,
    resistencia: 10,
    energia: 4,
    forca: 2,
    rank: 'Genin',
    clan: 'Senju',
    equipped_items: [{ bonus_stats: { HP: 20 }, upgrade_level: 0 }],
  };
  // (100 + 5*30 + 10*15 + 4*20 + 2*5 + 150 + 20) * 1.10
  assert.equal(calculateHP(player), 726);
});

test('Chakra e stamina máximos preservam os valores base de nível 1', () => {
  const novice = {
    level: 1,
    rank: 'Estudante da Academia',
    energia: 0,
    ninjutsu: 0,
    genjutsu: 0,
    taijutsu: 0,
    bukijutsu: 0,
    equipped_items: [],
  };
  assert.equal(calculateChakra(novice), 120);
  assert.equal(calculateStamina(novice), 120);
});

test('chance de crítico e esquiva usa agilidade / 10 e teto de 50%', () => {
  assert.equal(calculateCritChance({ agilidade: 0 }), 0);
  assert.equal(calculateCritChance({ agilidade: 99 }), 9);
  assert.equal(calculateCritChance({ agilidade: 100 }), 10);
  assert.equal(calculateCritChance({ agilidade: 1000 }), 50);
  assert.equal(calculateDodgeChance({ agilidade: 100 }), 10);
  assert.equal(calculateDodgeChance({ agilidade: 1000 }), 50);
});

test('desconto de chakra usa selo / 5 e teto de 50%', () => {
  assert.equal(calculateChakraDiscount({ selo: 0 }), 0);
  assert.equal(calculateChakraDiscount({ selo: 24 }), 4);
  assert.equal(calculateChakraDiscount({ selo: 25 }), 5);
  assert.equal(calculateChakraDiscount({ selo: 1000 }), 50);
});

test('vantagem e desvantagem elemental permanecem em 1.2 e 0.8', () => {
  assert.equal(getElementalMultiplier('Suiton', 'Katon'), 1.2);
  assert.equal(getElementalMultiplier('Katon', 'Suiton'), 0.8);
  assert.equal(getElementalMultiplier('Katon', 'Futon'), 1.2);
  assert.equal(getElementalMultiplier('Futon', 'Katon'), 0.8);
  assert.equal(getElementalMultiplier('Katon', 'Katon'), 1.0);
  assert.equal(getElementalMultiplier(null, 'Suiton'), 1.0);
});
