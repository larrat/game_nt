# Auditoria de itens para homologação — Kurokage v4

**Data da coleta:** 31/10/2026. **Referência:** Supabase `game_nt`, projeto `gvtbixbyqayhdwowgqrp`. **Operação efetuada no banco:** somente consultas `SELECT`, sem alteração de registros, esquema, inventários ou recompensas.

## Resultado confirmado
- `public.items`: **13** itens cadastrados.
- `public.player_inventory`: **8** entradas, associadas a **5** IDs de catálogo; **3** entradas equipadas.
- `public.consumables`: **6** produtos separados; `public.player_consumables`: **2** entradas, em consumíveis diferentes.
- A documentação `docs/reverse-engineering/coleta-2026-10-30/naruto-capturas/ninja_shop.txt` contém **86 ofertas** e **73 nomes distintos** representados em `src/data/documentedItemVisuals.js`.
- **1 correspondência exata:** `Shuriken Gigante` (ID 8). `Kunai de Aço` é semelhante a `Kunai` mas **não** equivale automaticamente a ele; diferenças de bônus/nível/raraidade precisam ser tratadas.
- Os **73 nomes são evidência documental visual**, não 73 itens de economia prontos para inserção. Sem definição de atributos, efeitos, preço e aquisição própria, não cadastrar automaticamente 72 novos produtos.

## Catálogo atual e impacto potencial
| ID | Item | Entradas inventário | Equipados | Tratamento proposto |
|---:|---|---:|---:|---|
| 1 | Bandana Simples | 2 | 0 | Legado **em uso**; preservar até remapeamento |
| 2 | Bandana Fortificada | 1 | 1 | Legado **equipado**; preservar |
| 3 | Colete Chunin | 0 | 0 | Candidato à retirada após substituição da loot table |
| 4 | Colete Jounin | 1 | 0 | Legado **em uso**; preservar |
| 5 | Protetor de Pulso | 2 | 1 | Legado **equipado**; preservar |
| 6 | Botas Ninja Padrão | 0 | 0 | Candidato à retirada após substituição da loot table |
| 7 | Kunai de Aço | 0 | 0 | Possível variante de Kunai; **não** renomear automaticamente |
| 8 | Shuriken Gigante | 0 | 0 | **Nome confirmado** na documentação; candidato à permanência |
| 9 | Kubikiribōchō (Espada Zabuza) | 2 | 1 | Legado **equipado**; preservar, revisar identidade autoral |
| 10 | Colar do Primeiro Hokage | 0 | 0 | Candidato à retirada após avaliação de recompensas |
| 11 | Baú de Incursão (Bronze) | 0 | 0 | Referenciado por função de recompensa do chefe; preservar temporariamente |
| 12 | Baú de Incursão (Prata) | 0 | 0 | Referenciado por função de recompensa do chefe; preservar temporariamente |
| 13 | Baú de Incursão (Ouro) | 0 | 0 | Referenciado por função de recompensa do chefe; preservar temporariamente |

**Nota:** “Sem entradas no inventário” não significa “seguro para apagar”. A RPC `kurokage_roll_loot` seleciona **aleatoriamente de toda `public.items`**, de modo que deletar itens muda imediatamente a distribuição de recompensas. A função `distribute_boss_rewards` procura nominalmente os três baús. Equipamento, loja, venda e refino também operam com IDs e tabelas relacionadas. As referências diretas de inventário têm chaves estrangeiras; as dependências dentro das funções não aparecem como FKs.

## Distinção de ambientes
O Supabase conectado apresenta apenas **um** projeto (`game_nt`). Ao mesmo tempo, a Vercel identifica `game-nt.vercel.app` como **target: production**, com publicação anterior à última `master`. O usuário esclareceu que o jogo está em **homologação, sem utilização real de produção**, e autorizou limpeza. Porém, **não há evidência de um segundo banco separado**. Consequentemente, consultas foram executadas, mas **não houve exclusão destrutiva** nesta auditoria; qualquer execução direta afetaria o banco ao qual o domínio público está ligado.

## Sequência técnica antes do primeiro DELETE
1. Definir de modo inequívoco a base que será migrada e verificar backup/restauração. Se a base é única, manter snapshot integral de `items`, `player_inventory`, `consumables`, `player_consumables`, gatilhos e funções de recompensa.
2. Definir o conjunto de itens que o Kurokage terá efetivamente: nome, categoria, slot, nível, raridade, preço, bônus/effects e drop pool **originais**, apenas tomando os 73 nomes como evidência documental. Conferir direitos de uso da imagem; usar `ItemArtwork` como fallback.
3. Inserir e homologar os itens **aprovados**, revisar loot, chefe, loja, refino, equipabilidade e inventário. Não usar preços do site concorrente como regras ativas.
4. Definir correspondência `ID_antigo → ID_novo` para os cinco IDs com inventário e alternativas para itens sem equivalente. Fazer migração transacional com checagem de contagem de referências, sem perda de equipamentos/raridade/rolled_stats/upgrade_level/favoritos.
5. Só então remover ou arquivar legados e atualizar scripts/seed para não recriá-los no próximo deploy. Comprovar rollback e teste de batalhas.
6. Executar QA das 31 telas no navegador autenticado em 390/320 e 1440/768. O CI não substitui QA.

## Evidências e artefatos
- **Consulta executável de auditoria:** `scripts/audit_homologation_items_v4.sql` (somente leitura, transação `READ ONLY`).
- **Catálogo visual de referência:** `src/data/documentedItemVisuals.js` (73 nomes; `approvedImage:null`).
- **Representação:** `src/components/ItemArtwork.jsx`.
- **Pendência:** issue [#85](https://github.com/larrat/game_nt/issues/85).

**Bloqueio paralelo de publicação:** tentativa de publicar `master` na Vercel recebeu `402 api-deployments-free-per-day` (limite diário do plano gratuito). Não foi feita contratação ou alteração de plano.
