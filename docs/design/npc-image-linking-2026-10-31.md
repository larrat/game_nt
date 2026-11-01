# Vínculo visual de NPCs, personagens e World Boss — primeira entrega

Data: 31/10/2026. Sem banco novo, storage, API paga ou biblioteca adicionada.

## Estado anterior verificado no código
- `Evento.jsx`: world boss era representado por emoji 🦊 e passava `/images/bg_forest.jpg` como avatar para o combate. Isso confundia cenário e retrato.
- `Combate.jsx`: só exibia imagens de NPC se `avatar` começasse por `/`; caso contrário, mostrava o valor como texto/emoji.
- O projeto já contém `public/images/naruto.jpg` e `public/images/sasuke.jpg`, além de acervo documental em `docs/reverse-engineering/`; o catálogo de documentos não é pasta de assets do app.
- `src/components/SidebarIcon.jsx` e `screenNavigation.js` já padronizam o menu via Lucide após PR #74.

## Entrega
1. `src/utils/npcPortrait.js` é o ponto central de correlação **nome da entidade → retrato local disponível**, preservando um avatar local explícito para os demais personagens.
2. Naruto e Sasuke reutilizam caminhos que já existiam na área pública do app; não foram copiadas novas artes de terceiros nesta PR.
3. A raposa das nove caudas ganhou um **SVG original provisório** em `public/images/bosses/` — não é a arte oficial da Kurama.
4. Evento e combate mostram o mesmo retrato do chefe. Diálogos do modo História também buscam retrato conhecido quando a quest não fornece um arquivo local específico.
5. Retratos quebrados no card de combate exibem fallback em vez de ícone de imagem quebrada.

## Como ampliar para os 188 personagens
Fazer correspondência **por identidade estável do NPC/character e variante** no catálogo visual do jogo; o mapa mínimo por nome atende somente Naruto, Sasuke e raposa nesta primeira entrega. Não deduzir identidade a partir de `id` numérico que conflite com `public.characters`; os identificadores do Naruto Game não são IDs locais. Normalizar variantes, aprovar/gerar artes originais e testar carregamento offline antes de adicionar caminhos ao resolvedor. Manter também alt/fallback e imagens leves.

## Direitos e publicação
O repositório `larrat/game_nt` e o site na Vercel são **públicos**. Uso pessoal não dá automaticamente licença para republicar arquivos obtidos de Naruto Game ou imagens de personagens protegidas. O acervo documental deve permanecer marcado como referência e ser auditado (issue #70). Para lançamento aberto, substituir/regularizar as artes existentes e usar imagens originais licenciadas. Esta PR **não transfere nem publica imagens adicionais** do acervo de terceiros.

## Critérios de QA
`npm test`, `npm run typecheck` e `npm run build`; após build validar os três caminhos locais, em desktop/mobile, e testar navegação Evento → Combate com World Boss real em conta descartável. A PR não modifica HP, tickets, RPCs, dados SQL nem autorização. Não declaramos E2E autenticado realizado.
