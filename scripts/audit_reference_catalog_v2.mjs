import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Audita fontes versionadas, sem acessar Supabase ou alterar produção.
 * A interface observada do Naruto Game NÃO fornece regras validadas do servidor.
 */
const norm = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').trim().toLocaleLowerCase('pt-BR');
const unique = array => new Set(array);

export async function auditReferenceV2(root = process.cwd()) {
  const load = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
  const catalog = await load('data/reference/observed-ninja-catalog.json');
  const initial = await load('data/reference/initial-characters.json');
  const supplement = await load('data/reference/supplemental-jutsus-2026-11-01.json');
  const clanImages = await load('docs/reverse-engineering/coleta-2026-10-30/imagens-clas/manifest.json');
  const storeItems = await load('docs/reverse-engineering/coleta-2026-11-01-lote2/ninja-shop-catalogo.json');
  const packs = await load('docs/reverse-engineering/coleta-2026-11-01-lote2/pacotes-catalogo.json');
  const lot2Manifest = await load('docs/reverse-engineering/coleta-2026-11-01-lote2/assets-manifest.json');

  const characters = initial.characters;
  const gallery = catalog.characterVersions;
  const clans = clanImages.images.filter(item => /^Cl[áãa]/i.test(item.name));
  const jutsus = [...catalog.jutsus, ...supplement.jutsus];
  const jutsuIds = jutsus.map(j => j.referenceId ?? j.id);

  const galleryNames = unique(gallery.map(v => norm(v.name)).filter(Boolean));
  const initialNames = unique(characters.map(c => norm(c.name)).filter(Boolean));
  const extraGalleryNames = [...galleryNames].filter(name => !initialNames.has(name));

  const issues = [];
  if (characters.length !== 184) issues.push('Contagem inesperada de personagens iniciais');
  if (gallery.length !== 767) issues.push('Contagem inesperada de variantes');
  if (clans.length !== 40 || catalog.clans.length !== 40) issues.push('Contagem inesperada de clãs');
  if (catalog.jutsus.length !== 700 || supplement.jutsus.length !== 19) issues.push('Contagem inesperada de técnicas');
  if (unique(jutsuIds).size !== jutsuIds.length) issues.push('IDs de jutsu repetidos entre coletas');
  if (jutsuIds.some(id => !/^i-jutsu-\d+$/.test(id))) issues.push('Identificador de jutsu inválido');
  if (characters.some(c => !c.id || !c.name)) issues.push('Personagem sem ID ou nome');
  if (gallery.some(v => !v.id || !v.name || !v.version)) issues.push('Versão sem identidade ou forma');
  if (clans.some(c => !c.file || !c.url)) issues.push('Clã sem referência visual');
  if (jutsus.some(j => !j.name)) issues.push('Jutsu sem nome');
  if (storeItems.items.length !== 86 || unique(storeItems.items.map(item => item.id)).size !== 86)
    issues.push('Itens da Ninja Shop: contagem ou IDs duplicados');
  if (storeItems.items.some(item => !/^\d+$/.test(String(item.id)) || !item.name))
    issues.push('Item da Ninja Shop sem identificação válida');
  if (packs.items.length !== 49 || unique(packs.items.map(pack => pack.id)).size !== 49)
    issues.push('Pacotes: contagem ou IDs duplicados');
  if (packs.items.some(pack => !/^#pack-\d+$/.test(String(pack.id)) || !pack.name))
    issues.push('Pacote sem identificação válida');
  if (lot2Manifest.screens.length !== 9 || unique(lot2Manifest.screens.map(screen => screen.screen)).size !== 9)
    issues.push('Lote 2: nove estados de tela esperados');
  if (lot2Manifest.assets.length !== 287 ||
      unique(lot2Manifest.assets.map(asset => asset.url)).size !== 287)
    issues.push('Lote 2: manifesto de 287 URLs esperado');
  if (lot2Manifest.screens.reduce((sum, screen) => sum + Number(screen.newFiles || 0), 0) !== 173)
    issues.push('Lote 2: 173 arquivos novos esperados');

  return {
    schemaVersion: 2,
    observedAt: '2026-11-01',
    counts: {
      initialCharacters: characters.length,
      additionalGalleryCharacters: extraGalleryNames.length,
      totalCharacterReferences: characters.length + extraGalleryNames.length,
      characterVariants: gallery.length,
      clans: clans.length,
      jutsus: jutsus.length,
      initialCatalogJutsus: catalog.jutsus.length,
      supplementalJutsus: supplement.jutsus.length,
      shopItems: storeItems.items.length,
      packs: packs.items.length,
      observedScreensLot2: lot2Manifest.screens.length,
      observedAssetUrlsLot2: lot2Manifest.assets.length
    },
    additionalGalleryNames: extraGalleryNames,
    warnings: [
      'Nomes presentes na galeria não são prova automática de que o personagem seja canônico ao universo Naruto.',
      'Não inferir clã por sobrenome nem ativar personagens/NPCs sem revisão.',
      'Requisitos e custos são observados na UI e dependem da classe da sessão; não habilitar combate automaticamente.',
      'Referências externas e arquivos de pesquisa não são prova de direito de publicação.',
      'Preços e probabilidades de pacotes não foram validados por compras reais.'
    ],
    issues
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === pathToFileURL(fileURLToPath(import.meta.url)).href) {
  const result = await auditReferenceV2(process.argv[2] || '.');
  console.log(JSON.stringify(result, null, 2));
  if (result.issues.length) process.exitCode = 1;
}
