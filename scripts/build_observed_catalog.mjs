import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const label = value => value.normalize('NFKD').replace(/\p{M}/gu, '').trim().toLowerCase();
const rankAliases = { chuunin: 'Chunin', chunin: 'Chunin' };

export function parseRequirements(lines) {
  const result = { attributesAll: {}, attributesAny: [], rank: null, item: null, clan: null, element: null, other: [] };
  for (const line of lines) {
    if (/QUALQUER um dos atributos/i.test(line)) {
      result.attributesAny = [...line.matchAll(/(\d+) em (Taijutsu|Bukijutsu|Ninjutsu|Genjutsu)/gi)]
        .map(([, value, attribute]) => ({ attribute: label(attribute), value: Number(value) }));
      continue;
    }
    let match = line.match(/^Requer (\d+) ponto\(s\) em (.+)$/i);
    if (match) { result.attributesAll[label(match[2])] = Number(match[1]); continue; }
    match = line.match(/^Requer gradua[cç][aã]o:\s*(.+)$/i);
    if (match) { result.rank = rankAliases[label(match[1])] || match[1]; continue; }
    match = line.match(/^Requer o item:\s*(.+)$/i);
    if (match) { result.item = match[1]; continue; }
    match = line.match(/^Requer o Cl[aãá]\s+(.+)$/i);
    if (match) { result.clan = match[1]; continue; }
    match = line.match(/^Elemento:\s*(.+)$/i);
    if (match) { result.element = match[1]; continue; }
    result.other.push(line);
  }
  return result;
}

export function observedJutsu(card, category, group, classes) {
  if (!/^i-jutsu-\d+$/.test(card.id || '')) throw new Error(`ID de técnica inválido: ${card.id}`);
  const image = new URL(card.image);
  if (image.protocol !== 'https:' || image.hostname !== 'narutogame.com.br') throw new Error('Origem de imagem inesperada');
  const costs = { combat: {}, learning: {} };
  const issues = [];
  for (const resource of card.resources) {
    if (!costs[resource.context] || !Number.isFinite(resource.value) || resource.value < 0) {
      issues.push('Custo ausente ou inválido');
      continue;
    }
    if (Object.hasOwn(costs[resource.context], resource.resource)) issues.push('Custo duplicado/ambíguo');
    costs[resource.context][resource.resource] = resource.value;
  }
  for (const context of ['combat', 'learning']) {
    for (const resource of ['chakra', 'stamina']) {
      if (!Object.hasOwn(costs[context], resource)) issues.push(`${context}: ${resource} não observado`);
    }
  }
  const classId = card.classIcon?.match(/\/habilidade-(\d+)\.png$/)?.[1];
  const attack = card.tooltipRows.find(row => /^Ataque \(/.test(row[0] || ''));
  const power = attack?.[1]?.match(/[+-]?\s*\d+/)?.[0];
  const cooldown = card.tooltipText?.match(/Intervalo de uso:\s*(\d+)/)?.[1];
  const duration = card.tooltipText?.match(/Dura[cç][aã]o:\s*(\d+)/)?.[1];
  return {
    referenceId: card.id,
    name: card.name,
    category,
    group,
    class: classId ? classes[classId] || null : null,
    rankDisplayed: card.rank,
    imageUrl: card.image,
    classOrElementIconUrl: card.classIcon,
    observedInClass: 'Genjutsu',
    requirements: parseRequirements(card.requirements),
    requirementsDisplayed: card.requirements,
    observedCombat: {
      attackFamily: attack?.[0] || null,
      displayedAttack: power ? Number(power.replace(/\s/g, '')) : null,
      cooldownTurns: cooldown ? Number(cooldown) : null,
      durationTurns: duration ? Number(duration) : null,
      costs,
      rows: card.tooltipRows,
    },
    verification: { status: issues.length ? 'requires_review' : 'observed', issues, globalBaseValuesVerified: false },
  };
}

export async function buildCatalog(root) {
  const dir = resolve(root, 'docs/reverse-engineering/coleta-2026-10-31');
  const json = async name => JSON.parse(await readFile(resolve(dir, name), 'utf8'));
  const general = await json('jutsus-gerais.json');
  const elemental = await json('jutsus-elementais.json');
  const clan = await json('jutsus-cla-detalhes.json');
  const gates = await json('jutsus-portoes.json');
  const temple = await json('templo-requisitos-versoes.json');
  const classes = Object.fromEntries(general.classMap.map(item => [item.id, item.name]));
  const jutsus = [];
  for (const group of general.categories) {
    jutsus.push(...group.jutsus.map(card => observedJutsu(card, 'general', group.class, classes)));
  }
  for (const group of elemental.elements) {
    jutsus.push(...group.jutsus.map(card => observedJutsu(card, 'elemental', group.element, classes)));
  }
  jutsus.push(...clan.jutsus.map(card => observedJutsu(card, 'clan', parseRequirements(card.requirements).clan, classes)));
  jutsus.push(...gates.jutsus.map(card => observedJutsu(card, 'gate', null, classes)));
  const ids = new Set();
  for (const jutsu of jutsus) {
    if (ids.has(jutsu.referenceId)) throw new Error(`Técnica repetida: ${jutsu.referenceId}`);
    ids.add(jutsu.referenceId);
  }
  const initial = JSON.parse(await readFile(resolve(root, 'data/reference/initial-characters.json'), 'utf8'));
  const images = JSON.parse(await readFile(resolve(root, 'docs/reverse-engineering/coleta-2026-10-30/imagens-clas/manifest.json'), 'utf8'));
  const clans = images.images.filter(item => /^Cl[ãá]/i.test(item.name)).map(item => {
    const name = item.name.replace(/^Cl[ãá]\s+/i, '');
    const techniques = jutsus.filter(jutsu => jutsu.requirements.clan === name);
    return {
      referenceId: `ng-clan-${item.url.match(/\/(\d+)\.png$/)?.[1]}`,
      name,
      imageUrl: item.url,
      localArtifactPath: `docs/reverse-engineering/coleta-2026-10-30/imagens-clas/${item.file}`,
      attributeAllocation: 'shared_customizable',
      fixedAttributeBonuses: null,
      techniqueIds: techniques.map(item => item.referenceId),
      requiredItemsObserved: [...new Set(techniques.map(item => item.requirements.item).filter(Boolean))],
      exclusiveAbilityEffects: null,
      status: 'reference_definition_pending_gameplay_validation',
    };
  });
  return {
    schemaVersion: 1,
    source: 'https://narutogame.com.br',
    observedAt: '2026-10-31',
    status: 'reference_definitions_not_automatic_gameplay_rules',
    rules: {
      offClassRequirements: 'A interface declara requerimentos dobrados para técnicas de outra classe. Os valores capturados são os exibidos para Genjutsu; não foram divididos ou extrapolados.',
      medicalAndKinjutsuModes: 'A interface declara uso somente em batalhas de equipe 4x4 e 4x1; essas categorias continuam pendentes nesta coleta.',
      clanAttributes: 'Distribuição personalizável compartilhada entre clãs; não há bônus fixos inferidos de seletores.',
    },
    classes,
    initialCharacters: initial.characters,
    characterVersions: temple.versions,
    clans,
    jutsus,
    pendingCategories: ['karma', 'kinjutsu', 'medical'],
  };
}

const thisFile = fileURLToPath(import.meta.url);
if (typeof process !== 'undefined' && process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === pathToFileURL(thisFile).href) {
  const root = resolve(process.argv[2] || '.');
  const catalog = await buildCatalog(root);
  await writeFile(resolve(root, 'data/reference/observed-ninja-catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(JSON.stringify({ characters: catalog.initialCharacters.length, variants: catalog.characterVersions.length, clans: catalog.clans.length, jutsus: catalog.jutsus.length }));
}
