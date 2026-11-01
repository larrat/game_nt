# GAME_NT / KUROKAGE RPG — DOCUMENTAÇÃO MESTRA CONSOLIDADA

**Versão:** 1.0 — 01/11/2026  
**Repositório:** `larrat/game_nt` · **Branch principal:** `master`  
**Projeto:** Kurokage RPG (GAME_NT)  
**Infraestrutura registrada:** React 19, Vite 8, Tailwind 4 híbrido, Motion, TypeScript incremental, Supabase/PostgreSQL e Vercel.  
**Status deste documento:** consolidação editorial dos documentos principais e índices do acervo; não substitui auditoria em tempo real da produção nem atesta testes não executados.

> **Convenção obrigatória:** distinguir *observado*, *documentado*, *implementado em branch*, *integrado à master*, *homologado* e *publicado*. Uma tela, arquivo, SQL ou PR não equivale a funcionalidade homologada.

## 1. Visão e escopo

Kurokage é um RPG ninja web de progressão, criação de personagens, atributos, técnicas, clãs, missão, combate, graduação, mundo/vila, equipamentos e competição. Naruto Game é **referência funcional e visual observada**; as regras próprias e a identidade Kurokage devem ser explicitadas separadamente. Nenhum dado coletado da interface do concorrente deve ser confundido com código-fonte, fórmula de servidor ou direito automático de redistribuição.

**Princípios não negociáveis:** (1) ações econômicas, XP, custo, recompensas e resultado de combate validados no servidor; (2) integridade e privacidade com RLS/ownership; (3) evolução visual sem regressão de motor; (4) UX consistente e responsiva; (5) material visual com proveniência e autorização documentadas; (6) nunca usar contas ou dados reais para testes invasivos.

## 2. Arquitetura e estrutura

- Frontend: React + Vite, CSS legado coexistindo com tokens v4, Tailwind, Motion e migração gradual para TypeScript. Código principal em `src/`; roteamento e shell em `src/App.jsx`; navegação em `src/utils/screenNavigation.js`.
- UI compartilhada: `src/styles/design-system-v4.css`, `src/styles/shared-screen-v4.css`, `src/components/SidebarIcon.jsx`, `src/components/ui/GameAction.jsx`, `GamePanel.jsx`, `PageHeader`, `ResourceMeter`, `NpcPortrait`.
- Motor cliente: `src/utils/engine.js` para apresentação/cálculos; **autoridade final em RPCs e tabelas do Supabase**. Diferenças JS/SQL exigem testes de caracterização.
- Backend: Supabase/PostgreSQL, migrations versionadas em `migrations/`; autenticação Supabase Auth, políticas RLS, RPCs privilegiadas auditadas por função.
- Deploy: Vercel, produção vinculada à `master` segundo snapshot anterior. CI esperado: `npm ci && npm test && npm run build`. Deploy READY isolado não significa E2E aprovado.
- Ambientes: staging separado e duas contas descartáveis A/B antes de aplicar política de segurança ou alterações de progressão em produção.

## 3. Catálogo de funcionalidades e situação

| Área | Funcionalidade documentada | Condição / aceitação pendente |
|---|---|---|
| Conta | Login, redefinição, confirmação de e-mail, criação/seleção (até 3 personagens) | SMTP próprio, redirects, links e ciclo E2E; impedir 4º personagem no servidor |
| Personagem | Status, avatar, título, 10 atributos básicos, 13 derivados, recursos HP/Chakra/Stamina/XP | Alinhar números cliente/SQL, estados nulos e arte final |
| Clãs/elementos | Adesão, distribuição de 7 pontos de clã, níveis e técnicas; elementos | Verificar requisitos/exclusividade, persistência e coerência do catálogo |
| Academia | Treinamento, técnicas e aprimoramento | Custos por RPC, requisitos, duplicidade, lote VIP e feedback |
| Missões | Tarefas com tempo, recompensa e histórico | Replay da migração 060, conclusão única e controle de prazo |
| Combate | Dojo, PvE, sessões, turnos, cooldowns, boss e registros | Negar autoria de outra conta, replay e duplicação de recompensa |
| Progressão | XP, nível, graduações e exame | Regras do banco; rotas de graduação testadas com casos positivos/negativos |
| Mundo | Mapa, Vila, História, Evento, viagem e Radar | Navegação, autorização, NPCs e eventos com cenários reais |
| Economia | Equipamentos, inventário, compra/venda, Ferreiro, Hospital, Ichiraku | Transações atômicas; favoritos/equipados; recibos e rollback |
| Avançados | Invocações, Portões, Templo, talentos, selos, Karma, profissões, ranking e VIP | Dependências por desbloqueio e QA específico |
| Adversários | Arquivo de Adversários, NPCs e personagens de catálogo; sombras de jogadores | Projeção visual ≠ combate autorizado; PvP real é outro sistema |
| Futuro | Multiplayer/PvP ao vivo, temporadas, guerras, Phaser 2D | Planejado, não anunciar como publicado |

**Rotas citadas no inventário:** `/login`, `/redefinir-senha`, `/criar`, `/selecionar`, `/dashboard`, `/status`, `/equipamentos`, `/clas`, `/elementos`, `/invocacoes`, `/treino`, `/tecnicas`, `/aprimorar-jutsus`, `/tarefas`, `/graduacoes`, `/exame`, `/dojo`, `/adversarios`, `/mapa`, `/historia`, `/evento`, `/historico`, `/ranking`, `/vila`, `/hospital`, `/ferreiro`, `/ichiraku`, `/portoes`, `/templo`, `/vip`. Conferir os paths exatos em `src/App.jsx` para releases.

## 4. NPCs, personagens e adversários — decisão atual

**Decisão do responsável (01/11): NPC nomeado deve corresponder a personagem existente e identidade coerente; nunca inventar um Yamanaka ou combinar Naruto com Uchiha como se fosse canônico.** Exemplos: Naruto Uzumaki, Sasuke Uchiha, Itachi Uchiha, Neji Hyūga e Ino Yamanaka. Formas/etapas do mesmo personagem podem ser variantes com identificação explícita e retrato adequado. Registrar clã, personagem-base, variante, origem e arte; não deduzir parentesco apenas pelo sobrenome ou usar o nome como chave global.

**Fontes separadas:** `public.npcs` (NPC persistente, ID numérico), `public.characters` (catálogo, ID textual) e `listar_perfis_ninja` (projeção pública de jogadores). `opponent_origin`: `npc`, `catalog_character`, `player_shadow`. Perfil de jogador tem prioridade sobre a arte do personagem homônimo. Não copiar dados privados; sombra não é PvP vivo e não deve conceder recompensas por uma batalha sem sessão autorizada.

**Fotografia histórica de 31/10:** 188 personagens, 222 avatares, 15 NPCs ativos, 57 jutsus jogáveis registrados; 184 das URLs de avatar-base eram externas. Números são snapshot, **não inventário confirmado em 01/11**. A maioria dos NPCs nomeados não tinha retrato específico local; seus placeholders precisam ser neutros e acessíveis. Para novos NPCs, aprovação explícita de identidade e arte; os registros legados no banco requerem revisão/migração independente.

**PR #98 (01/11), em rascunho:** remove emoji dos adaptadores de adversários, remove associação visual genérica a NPCs gerados, substitui fallback de jutsu por estado neutro, acrescenta os ícones de atributos em Status e adapta testes. **Não significa merge, deploy, banco migrado, nem catálogo canônico saneado.**

## 5. Identidade visual — contrato Kurokage v4

- Direção: **Quartel Ninja / Kurokage**, interface escura, legível, progressão clara e densidade controlada; não copiar a marca do concorrente.
- Tokens canônicos: fundo `#080d14`, superfície `#131c27`, elevação `#1c2835`, dourado `#ebc17c`, vermelho `#d64750`, texto `#f3ecdf`, secundário `#b9bbc0`.
- UI Kit: `GameAction` com tons seal/quiet/gold/danger; `GamePanel`, `PageHeader`, medidores padronizados; elementos com foco/disabled/loading.
- **Ícones:** navegação pode manter Lucide consistente; atributos, clãs, jutsus, retratos, itens e cenário exigem arte ninja ilustrada aprovada, não emoji. Referências locais de atributos em `public/images/icons/{agilidade,selo,forca,inteligencia,resistencia,ninjutsu,genjutsu,taijutsu,energia,bukijutsu}.jpg`, resolvidas por `getAttributeArtworkUrl`.
- Arte ausente: placeholder neutro, alt apropriado e indicação de indisponibilidade; não substituir por retrato genérico que falsifique a identidade.
- Mobile: conferir 320, 390, 768 e 1440 px; hover/foco, teclado, toque >=44 px quando adequado, contraste, reduced-motion e carregamento/erro.
- A base v4 alcança várias telas por CSS global, mas **não equivale a redesign específico nem aprovação de cada tela**.
- A documentação registra relato do responsável sobre autorização de uso de imagens do Naruto Game; escopo, prova documental, transformações, redistribuição e direitos de terceiros continuam a exigir registro verificável. Acervo em `docs/reverse-engineering` **não é automaticamente arte publicável**.

## 6. Engenharia reversa e acervo observacional

O repositório mantém observações e arquivos de interface do Naruto Game nas pastas `docs/reverse-engineering/coleta-2026-10-30/`, `coleta-2026-10-31/`, `coleta-2026-11-01/`, além de catálogos em `data/reference/`.

- 30/10: levantamento histórico de cerca de 76 rotas; coletas de personagens, clãs, jutsus, processos, diálogos e ícones; 40 clãs e 320 técnicas de clã documentadas, 700 técnicas no catálogo inicial; protótipos e guias visuais.
- 31/10: observações controladas de Taijutsu, treinamento, progressão, habilidades e combates; contexto específico da conta; não extrapolar para todos os estilos.
- 01/11: 10 telas exportadas, 287 URLs estáticas e 262 arquivos únicos por hash nesta coleta; suplemento de 19 técnicas (total de **719 IDs distintos catalogados**, não 719 aprendíveis no Kurokage), 32 tooltips de talentos, oito estágios de Karma, 12 de selo e 30 cartões de profissão.
- Catálogo visual de versões/temas: 767 versões e 550 temas VIP reportados em levantamentos anteriores. Números entre coletas se sobrepõem; não somar sem deduplicar por hash e ID.
- Capturas de DOM/HTML, catálogos JSON e registros de combate são **evidências brutas**, não regras homologadas nem acesso ao código PHP ou banco do jogo de referência.
- Catalogação futura: mapear personagem → variantes → clã → arte/licença; técnica → classe/elemento/clã → requisitos AND/OR, duração, custo e desbloqueio. Validar requisitos no servidor antes de tornar o catálogo jogável.

## 7. Segurança, autenticação e privacidade

**Baseline de 31/10**: migração `063_public_player_profiles` registrada; `064_private_player_select_rls` ainda pendente. A política de leitura ampla `players_select_authenticated USING(true)` exige substituição controlada, mas **não aplicar 064 diretamente em produção sem staging e teste A/B**. Verificar Ranking, Vila, Mapa, Dojo, seleção e Exame após a restrição owner-only. Quatro RPCs de perfis resumidos suportam consumidores públicos autenticados.

Auditoria histórica mudou de 47 para 52 funções `SECURITY DEFINER` executáveis por `authenticated` no snapshot posterior. Trata-se de **superfície a revisar**, não de 52 vulnerabilidades comprovadas. Auditar cada RPC: grants, owner, parâmetros, custo, race, replay, search_path e testes negativos.

**Auth:** relatos de cadastro repetido com `user_repeated_signup`, sem prova de envio de confirmação. É necessário SMTP próprio e domínio verificado, URLs de redirect corretas, Confirm Email, proteção contra senhas vazadas; links de reset devem abrir formulário de redefinição, sem tratar recuperação como login normal por engano. Testar conta realmente inédita, reenvio, expiração e links inválidos.

**Economia:** migrations 060 (bloqueio de replay de missão), 061 (integridade de itens, conforme documentos) e outras correções requerem validação de estado e auditoria de SQL efetivamente aplicado. Nunca confiar em XP/dano/preço enviados pelo cliente como valor final.

## 8. Testes obrigatórios / Definition of Done

A jornada mínima de release é: **cadastro novo → confirmar e-mail → login → criar/selecionar personagem → Status → treino → aprender jutsu → iniciar e concluir missão → vencer PvE → receber uma única recompensa → graduação → recarregar e confirmar persistência**.

Além da jornada positiva, executar conta B tentando ler/alterar personagem A; 4º personagem; técnica sem requisito; treino com saldo insuficiente; missão antecipada/repetida; compra/venda de item equipado/favorito; combate inválido, cooldown, sessão obsoleta e recompensa repetida. Testar visual desktop/mobile e acessibilidade.

Evidência mínima: ID do caso, commit, ambiente, schema/migration, estado prévio não sensível, ação, resposta do servidor, estado posterior, screenshots sem PII, resultado e issue/PR. Aprovação requer CI verde, merge na master, deploy READY e E2E autenticado real; nenhum substitui outro.

## 9. Roadmap executivo atualizado

| Prioridade | Ação | Estado de referência |
|---|---|---|
| P0 | SMTP + confirmação/reset E2E | Bloqueio de configuração/homologação |
| P0 | Staging A/B + migração RLS 064 controlada | Preparação documentada; não executar em produção sem gate |
| P0 | Testes de economia, replay, ownership e 52 RPCs | Revisão parcial; E2E pendente |
| P1 | Conciliar design system v4 e homologar 31 módulos | Base comum implementada; QA por tela incompleto |
| P1 | Revisão canônica de NPCs, variantes e clãs | Decisão aprovada; migração do catálogo pendente |
| P1 | Completar artes/ícones em Status, Treino, Clãs, Combate e Mapa | PR #98 parcial, ainda sem merge confirmado |
| P1 | Homologar percurso crítico do RPG | Não comprovado de ponta a ponta |
| P2 | Normalizar 719 técnicas catalogadas (não ativar automaticamente) | Análise/modelagem pendente |
| P2 | Otimizar Vercel/deploy e assets com proveniência | Medir custo e cobertura antes de decisões |
| P3 | Phaser 2D, temporadas, social, guerra e PvP ao vivo | Futuro / protótipos isolados |

**Regra de mudança:** PR pequena, sem alterar progressão ou produção em tarefas exclusivamente visuais. Para SQL: preflight, staging, testes A/B, rollback, documentação e autorização de rollout.

## 10. Contradições e correções de interpretação

1. Documentos anteriores informavam que Clãs ainda usava `ATTR_ICONS` com emojis; inspeção posterior do código confirma `getAttributeArtworkUrl` nessa tela. **Priorizar evidência do código atual**.
2. O inventário antigo tratava retratos de renegados genéricos como solução visual temporária; decisão nova exige NPCs canônicos e fallback neutro. PR #98 é mudança de rumo, não migração de dados.
3. A PR #65 e os catálogos de pesquisa podem estar na master, mas isso não significa publicação de todas as artes nem 719 jutsus ativos no banco.
4. Problemas de segurança apontados por snapshots antigos devem ser reavaliados à luz das migrations posteriores; não tratar auditorias históricas como incidentes ativos comprovados.
5. 31 telas sob CSS global não significam 31 telas visualmente homologadas.
6. Aprovação informal de imagens relatada não é licença de terceiros verificada arquivo a arquivo.
7. Divergências de referência entre “Quartel Ninja” e login cinematográfico devem ser resolvidas por tela sem introduzir novo design system concorrente.

## 11. Fontes auditáveis dentro do repositório

Documentos de origem (mantidos para rastreabilidade): `README.md`, `docs/README.md`, `docs/ROADMAP-INTEGRADO-2026-10-31.md`, `docs/EXECUTION-BOARD-2026-10-31.md`, `docs/MODULOS-SITUACAO-ATUAL-2026-10-31.md`; `docs/design/` (ADRs, design system v4, artes, NPCs, UX); `docs/implementation/` (ciclo de conta, Academy, combate, treino, status, CI, TS/Motion, Vercel); `docs/security/` (auth, RLS, RPC, integridade); `docs/qa/JORNADA-CRITICA-2026-10-31.md`; `docs/audits/` (itens); `docs/reverse-engineering/` (inventários, documentação e coletas datadas).

**Evidências brutas relacionadas:** `data/reference/`, `docs/reverse-engineering/coleta-2026-10-30/`, `coleta-2026-10-31/`, `coleta-2026-11-01/`. Permanecem arquivos de suporte, não se duplicam integralmente aqui: milhares de linhas de capturas e JSONs não devem ser interpretados como texto normativo. **Esta é uma síntese consolidada, não a transcrição integral dos 344 arquivos textuais encontrados**.

**Controle de revisão:** atualizar este documento na mesma PR de toda mudança relevante: registrar data, commit/PR, ambiente, estado e prova. Propostas não entram como “publicado” sem evidência.

## 12. Nova base de referências — implantação controlada de 01/11/2026

**Estado confirmado no Supabase `gvtbixbyqayhdwowgqrp`: STAGING PRIVADO CARREGADO; catálogo operacional anterior preservado. Não houve limpeza de dados de produção, nem merge de conteúdo no gameplay.**

- Lote: `content_reference.import_batches.batch_id = ng-2026-11-01-v2` (`status=staging`).
- `content_reference.entries`: **1.767** registros observados — **241 referências de personagens** (184 iniciais + 57 nomes adicionais presentes na galeria, todos ainda sujeitos a curadoria canônica), **767 variantes**, **40 clãs** e **719 jutsus** (700 anteriores +19 de 01/11).
- `content_reference.source_files`: **2.855 arquivos indexados** por caminho, SHA de blob GitHub, tamanho e tipo. Índice não duplica os 348 MB de arte/acervo nem concede licença de publicação.
- `content_reference.legacy_catalog_snapshot`: **668 registros de oito catálogos antigos** (`characters` 188, `avatars` 222, `clans` 19, `clan_skills` 75, `jutsus` 57, `npcs` 15, `items` 13, `missions` 79).
- A infraestrutura permanece privada: sem privilégios de `USAGE` para `anon` nem `authenticated`, RLS habilitado sem políticas de acesso; nenhum item tem `gameplay_enabled=true` ou `review_status=approved`.
- `public.players` permanece com 2 registros; catálogos ativos `public.characters` e `public.jutsus` permanecem com 188 e 57, respectivamente. **Nenhum dado operacional foi apagado.**
- Referências de personagens foram coletadas da galeria; nomes presentes nela **não significam confirmação universal de canonicidade Naruto**. Validar identidade, clã e versão antes de transformá-las em NPC jogável.
- A revisão inicial identificou 28 referências de clã sem correspondência exata de nome em `public.clans` e apenas 1 jutsu do novo acervo que coincide por nome com `public.jutsus`; isso torna inadequada uma troca cega de IDs/requisitos.
- O banco registra dependências: `players` → `characters`/`avatars`/`clans`, `player_jutsus` e `jutsu_effects` → `jutsus`, `player_inventory` → `items`, sessões e derrotas → `npcs`. Não executar `TRUNCATE CASCADE`.
- Esquema SQL versionado e auditoria offline na branch `content/reference-catalog-v2-20261101`, com teste automatizado. PR de revisão separada do PR #98 de ícones/NPCs.

**Próximos gates para troca do catálogo ativo:** validar personagens verdadeiros e correspondência de clãs; comprovar direitos/proveniência de artes; revisar custos, requisitos AND/OR e efeitos por classe; mapear IDs existentes preservando chaves estrangeiras; montar cutover idempotente com rollback em staging; rodar testes com contas A/B; só depois aplicar aprovações e migração de conteúdo ativo em produção. Técnicas observadas não devem ser ativadas automaticamente.


## 13. Coleta Naruto Game — 01/11/2026, Lote 2 (PR #99)

**Origem:** \`docs/reverse-engineering/coleta-2026-11-01-lote2/README.md\` (integrada à \`master\` na PR #99). Sessão autenticada com personagem nível 5; **sete rotas, nove estados de tela**; observações não representam catálogo completo nem comprovação de funcionalidades em condições de jogo reais.

**Evidências e contagens desta coleta:**

| Sistema observado | Cobertura | Limitações |
|---|---|---|
| Ninja Shop | 86 IDs de itens, com nomes, preços renderizados, requisitos, imagens e tooltip do DOM | Nomes podem repetir; compra, equipamento e uso não foram testados |
| Pacotes | 49 IDs de cartões, preços, limites e recompensas possíveis indicadas em tela | Pacotes não comprados/abertos; não inferir probabilidades reais |
| Sensei | 28 opções/botões de escolha e tipos aparentes de acesso | Nenhum vínculo feito, desafios futuros não observados |
| Loja do Sensei | 20 marcos de recompensa (1–150 desafios); tela indica limite de uma compra por round | Nenhum resgate testado |
| Baú | Hinata Lunar e Himawari Uzumaki — Time Skip | Ofertas observadas, não inventário ou posse |
| Caçada Ninja | Ino — Halloween; 100 fragmentos mostrados; oferta de 10 fragmentos por 5 créditos | Desbloqueio e compra não testados |
| Reforja | Controles e categorias visíveis, sem equipamento elegível da conta | Custos efetivos, rolagem e resultado desconhecidos |
| Equipamentos | Diálogo Soma de Atributos abriu com Taijutsu +0; Histórico de Drop sem resultado confirmado | Fórmulas, bônus completos e histórico não validados |

**Acervo deste lote:** 287 URLs estáticas no manifesto (podem referenciar arquivos da coleta anterior) e **173 novos arquivos baixados**, hashes SHA-256. Os arquivos de pesquisa estão em \`docs/reverse-engineering/coleta-2026-11-01-lote2/\`; \`assets-index.html\` permite consulta local. Evitar somar URLs de coletas como se fossem mídias distintas.

**Integração de referência no Supabase concluída em 01/11:** foram adicionadas **86 entradas \`item\`**, **49 \`pack\`** e **nove \`observed_screen\`**, com origem e payload de referência, todas em \`content_reference.entries\` no lote \`ng-2026-11-01-v2\`. As **187 novas entradas de arquivo Git** (173 mídias + 14 arquivos de documentação/manifests) foram indexadas em \`content_reference.source_files\`. Totais consolidados após a atualização: **1.911 entradas de referência** e **3.042 arquivos indexados**. 0 aprovadas ou ativadas para gameplay. Nenhuma alteração em \`public.items\` (13 registros), \`public.jutsus\` (57), \`public.npcs\` (15) e \`public.players\` (2).

**Próximas ações:** revisar preços/requisitos de itens com IDs estáveis sem assumir que os valores de tooltip são regras validadas; mapear os 86 itens à modelagem local de equipamentos e suas dependências; modelar pacotes e sistemas de resgate com servidor autoritativo, direitos/proveniência das imagens e controle econômico; testar em staging com contas descartáveis antes de promover para produção. Senseis, recompensas e estados de loja ainda são observações de UI, não linhas de jogo aprovadas.

**Governança:** PR #99 levou a coleta à master; PR #100 prepara a infraestrutura e o manual consolidado. Como o documento mestre havia sido criado na branch da PR #98 *depois* do merge daquela PR, esta PR #100 traz a primeira inclusão efetiva do documento mestre na linha de integração principal. Não supor que ele já estivesse na master.

