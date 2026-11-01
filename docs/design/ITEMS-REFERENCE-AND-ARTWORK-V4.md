# Catálogo visual de itens documentados — Kurokage v4

**Estado:** preparado no código; sem importação de itens para o banco e sem inclusão de mídia de terceiros. **Fonte:** `docs/reverse-engineering/coleta-2026-10-30/naruto-capturas/ninja_shop.txt`, registro histórico da Ninja Shop.

## O que foi observado
A coleta registra **86 ofertas** que correspondem a **73 nomes únicos**; preços repetidos ou variantes de custo não identificam necessariamente produtos distintos. Entre eles estão Shuriken, Kunai, Senbons, Makibishi, Tarja Explosiva, Bomba de Luz, pergaminhos de teletransporte, Ninjaken, Tantou e Espada de Kusanagi. Os preços capturados são evidência de outra economia, **não** preços aprovados no Kurokage.

A lista completa desses nomes e seus ícones semânticos encontra-se em `src/data/documentedItemVisuals.js`. O mapeamento utiliza apenas o nome; ele **não** cria itens, IDs, categorias oficiais, inventário, atributos, ofertas, recompensas ou RPCs.

## Ligação visual
- `src/data/documentedItemVisuals.js`: 73 entradas de referência, com nomes normalizados e ícones do registro Lucide `SidebarIcon`, fallback `package` para itens sem correspondência.
- `src/components/ItemArtwork.jsx`: renderiza ícone local quando não há arte autorizada. Suporta futura imagem somente se explicitamente vinculada e em `/images/item-art/`, com extensão `.png`, `.webp` ou `.svg` e fallback em erro.
- `src/pages/Equipamentos.jsx`: aplica a representação ao slot equipado e à mochila **sem alterar** as ações de equipar, favoritar e vender.

**Importante:** o repositório contém imagens coletadas e arquivos públicos com nomes de Naruto. **Estarem presentes na documentação ou no repositório não prova autorização para republicação.** Todas as entradas do manifesto estão inicialmente com `approvedImage: null`. Nenhuma imagem da Ninja Shop foi adicionada à aplicação nesta etapa. Para colocar arte real em produção, aprovar autoria/licença, inserir uma versão otimizada local e vincular a imagem à entrada correspondente.

## Próxima migração de itens (após a repaginação de todas as telas)
1. Ler catálogo atual de `public.items` e inventário/referências dos jogadores **somente em auditoria**, cruzando nomes e tipos com este manifesto. Não presumir que nomes iguais representem o mesmo ID ou as mesmas propriedades.
2. Classificar **confirmado de referência**, **legado exclusivo do Kurokage**, **variante**, **ambíguo** e **em uso**; não deletar ainda.
3. Preparar tabela de correspondência e plano de migração reversível. Preservar equipados, favoritos, histórico, drops e saves de jogador. Revisar impactos em RPCs, scripts de seed e recompensas.
4. Executar correções em ambiente de testes e conferir integridade, RLS, gameplay e as duas contas descartáveis antes de solicitar qualquer remoção em produção.

## Validação
`npm test`, `npm run build`, observação no desktop/mobile em conta autenticada. Este manifesto é **curadoria visual**, não autorização de alterar o catálogo ou o banco.
