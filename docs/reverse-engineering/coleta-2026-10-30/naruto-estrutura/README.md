> Registro histórico: bloqueios e pendências abaixo refletem a coleta inicial. Consulte [a validação posterior](../validacao-funcional.md) e [o índice atual](../README.md). As cópias publicadas foram sanitizadas.

# Estrutura do cliente e revisão de 76 telas

Coleta de 30/10/2026. Personagem Estudante, nível 2. Inspeção de páginas renderizadas e recursos entregues ao navegador; não recupera código PHP, banco ou arquivos internos do servidor.

## Resultado

- 76 rotas revistas; 40 sem redirecionamento para negado; 36 com bloqueio observado.
- Exportação inicial de assets: 108 solicitados, 95 salvos, 13 falhas. Manifesto registra cada resultado.
- Inventário inicial: 67 imagens, 35 estilos, 35 scripts, 4 fontes e 12 outros recursos. Contagens são do inventário observado, não de arquivos exclusivos de todo o site.
- Scripts foram inventariados por URL; seus corpos não foram baixados por essa capacidade. Não foram executados arquivos baixados.

## Organização observada

Roteamento por index.php?secao=…; variantes de academia usam tipo. A interface compartilha cabeçalho, recursos do personagem, navegação por grupos, conteúdo central, rodapé e chat. IDs/classes são pistas de composição do cliente, não nomes de tabelas ou módulos internos.

Dependências referenciadas incluem jQuery 3.6.0, Bootstrap 4.0.0, Popper, Bootbox, Slick, SweetAlert2, bootstrap-select, contagem regressiva, Socket.IO e componentes de abas/inventário. A inclusão de um script não prova uso em cada página nem versão do servidor. Recursos de publicidade/analytics foram mantidos fora da arquitetura proposta do game_nt.

## Mapa por tela

Tabelas e controles são contagens do documento e podem incluir estrutura compartilhada. Uma rota aberta não implica conclusão do carregamento nem validação de ações.

| Tela | Rota | Resultado | Tabelas | Controles |
|---|---|---|---:|---:|
| Itens VIP | `?secao=jogador_vip` | Aberta; ações pendentes | 0 | 23 |
| Seja VIP | `?secao=vantagens` | Aberta; ações pendentes | 1 | 19 |
| Temas VIP | `?secao=temas` | Aberta; ações pendentes | 0 | 22 |
| Fórmulas do Jogo | `?secao=atributos` | Aberta; ações pendentes | 5 | 17 |
| Notícias | `?secao=noticias` | Aberta; ações pendentes | 0 | 17 |
| 8 Portões de Chakra | `?secao=portoes` | Bloqueada | 0 | 17 |
| Chakra das Bijuus | `?secao=chakras_bijuus` | Bloqueada | 0 | 17 |
| Clãs | `?secao=clas` | Bloqueada | 0 | 17 |
| Conquistas | `?secao=conquistas` | Aberta; ações pendentes | 1321 | 36 |
| Elementos | `?secao=personagem_elementos` | Bloqueada | 0 | 17 |
| Estudo Ninja | `?secao=estudo_ninja` | Aberta; ações pendentes | 0 | 76 |
| Espadas da Névoa | `?secao=espadas` | Bloqueada | 0 | 17 |
| Fidelidade Ninja | `?secao=fidelidade` | Aberta; ações pendentes | 0 | 77 |
| Histórico Ninja | `?secao=historico` | Aberta; ações pendentes | 8 | 24 |
| Karma | `?secao=karma` | Bloqueada | 0 | 17 |
| Kekkei Genkai | `?secao=kekkei` | Bloqueada | 0 | 17 |
| Invocações | `?secao=invocacao` | Bloqueada | 0 | 17 |
| Mode Sennin | `?secao=mode_sennin` | Bloqueada | 0 | 17 |
| Modo História | `?secao=historia` | Bloqueada | 0 | 17 |
| Objetivos | `?secao=objetivos` | Aberta; ações pendentes | 0 | 17 |
| Passe de Batalha | `?secao=passe_batalha` | Aberta; ações pendentes | 0 | 60 |
| Profissão | `?secao=profissao` | Bloqueada | 0 | 17 |
| Recompensas | `?secao=recompensa_log` | Aberta; ações pendentes | 1 | 17 |
| Status | `?secao=personagem_status` | Aberta; ações pendentes | 0 | 17 |
| Selo Amaldiçoado | `?secao=selo` | Bloqueada | 0 | 17 |
| Sorte Ninja | `?secao=sorte_ninja` | Bloqueada | 0 | 17 |
| Talentos Ninja | `?secao=arvore_talento` | Aberta; ações pendentes | 0 | 81 |
| Aprender Jutsus | `?secao=academia_jutsu` | Bloqueada | 0 | 17 |
| Graduações | `?secao=graduacoes` | Bloqueada | 0 | 17 |
| Jutsus Elementais | `?secao=academia_jutsu&tipo=1` | Bloqueada | 0 | 17 |
| Jutsus de Portão | `?secao=academia_jutsu&tipo=5` | Bloqueada | 0 | 17 |
| Jutsus de Karma | `?secao=academia_jutsu&tipo=7` | Bloqueada | 0 | 17 |
| Jutsus de Clã | `?secao=academia_jutsu&tipo=2` | Bloqueada | 0 | 17 |
| Kinjutsus | `?secao=academia_jutsu&tipo=6` | Bloqueada | 0 | 17 |
| Jutsus Medicinais | `?secao=academia_jutsu&tipo=3` | Bloqueada | 0 | 17 |
| Treinamento de Atributos | `?secao=academia_treinamento` | Bloqueada | 0 | 17 |
| Treinamento de Jutsus | `?secao=personagem_jutsu` | Bloqueada | 0 | 17 |
| Desafios | `?secao=desafios` | Aberta; ações pendentes | 0 | 18 |
| Loja | `?secao=loja_sensei` | Aberta; ações pendentes | 0 | 37 |
| Sensei | `?secao=sensei` | Aberta; ações pendentes | 0 | 45 |
| Tutorial | `?secao=tutorial` | Aberta; ações pendentes | 0 | 17 |
| Baú | `?secao=bau` | Aberta; ações pendentes | 0 | 19 |
| Ninjas | `?secao=templos` | Aberta; ações pendentes | 0 | 20 |
| Objetivos | `?secao=templo_objetivos` | Aberta; ações pendentes | 0 | 67 |
| Temas | `?secao=temas_ninja` | Aberta; ações pendentes | 0 | 20 |
| Caçada Ninja | `?secao=cacada` | Bloqueada | 0 | 17 |
| Equipamentos Ninja | `?secao=equipamentos_ninja` | Bloqueada | 0 | 17 |
| Eventos | `?secao=vila_eventos` | Aberta; ações pendentes | 0 | 17 |
| Fórum | `?secao=vila_forum` | Aberta; ações pendentes | 1 | 20 |
| Guerra de Vilas | `?secao=guerra_vila` | Bloqueada | 0 | 17 |
| Objetivos | `?secao=vila_objetivos` | Aberta; ações pendentes | 0 | 17 |
| Ninja Shop | `?secao=ninja_shop` | Bloqueada | 0 | 17 |
| Pacotes | `?secao=packs` | Bloqueada | 0 | 17 |
| Ramen Ichiraku | `?secao=ramen_shop` | Bloqueada | 0 | 17 |
| Reforja de Equipamentos | `?secao=reforja` | Bloqueada | 0 | 17 |
| Status da Vila | `?secao=vila` | Aberta; ações pendentes | 0 | 17 |
| Tarefas | `?secao=licoes` | Bloqueada | 0 | 17 |
| Votação dos Conselheiros | `?secao=votacao_vila` | Bloqueada | 0 | 17 |
| Dojo | `?secao=dojo` | Bloqueada | 0 | 17 |
| Dojo 4x4 | `?secao=dojo4x4` | Bloqueada | 0 | 17 |
| Histórico de Batalhas | `?secao=log_batalha` | Aberta; ações pendentes | 0 | 17 |
| Missões de Combate | `?secao=quest_combat` | Bloqueada | 0 | 17 |
| Torneios | `?secao=torneio` | Bloqueada | 0 | 17 |
| 4x4 | `?secao=rank_4x4` | Aberta; ações pendentes | 0 | 22 |
| Bijuus | `?secao=rank_bijuus` | Aberta; ações pendentes | 0 | 23 |
| Combates | `?secao=rank_batalhas_status` | Aberta; ações pendentes | 0 | 23 |
| Conquistas | `?secao=rank_conquistas` | Aberta; ações pendentes | 0 | 21 |
| Equipes | `?secao=rank_equipes` | Aberta; ações pendentes | 0 | 21 |
| Espadas da Névoa | `?secao=rank_espadas` | Aberta; ações pendentes | 0 | 23 |
| Estudo Ninja | `?secao=rank_estudo_ninja` | Aberta; ações pendentes | 0 | 21 |
| Guerra Ninja | `?secao=rank_guerra` | Aberta; ações pendentes | 0 | 22 |
| Ninjas | `?secao=rank_ninjas` | Aberta; ações pendentes | 0 | 22 |
| Organizações | `?secao=rank_guilds` | Aberta; ações pendentes | 0 | 21 |
| Sensei | `?secao=rank_sensei` | Aberta; ações pendentes | 0 | 22 |
| Templo Ninja | `?secao=rank_templo_ninja` | Aberta; ações pendentes | 0 | 21 |
| Vilas | `?secao=rank_vilas` | Aberta; ações pendentes | 0 | 17 |

## Aplicação ao game_nt

Separar a implementação em shell do jogo (menu, perfil e recursos), páginas de sistema, tabelas reutilizáveis, filtros, cartões de requisitos e estados de carregamento/erro. Preservar a validação autoritativa no backend próprio. A estrutura do DOM de referência não determina o modelo de dados.

## Evidências locais

- screen-review.json: títulos, tabelas, controles, estilos e scripts por rota.
- assets-inventory.json: inventário inicial de recursos.
- page-structure.json: regiões DOM e dependências da página inicial inspecionada.
- assets/: arquivos exportados e manifesto de sucesso/falha.
- Um snapshot textual por rota nesta pasta.

Os arquivos brutos podem conter conteúdo de sessão e links de terceiros. Não publicar sem revisão. Artes e arquivos da referência ficam como material de análise; sua presença no pacote não estabelece licença para redistribuição ou incorporação ao jogo.

## Limitações e próximos passos

Inspecionar abas, filtros e detalhes das 40 páginas abertas; estabilizar conteúdo assíncrono; resolver acesso normal às 36 bloqueadas conforme os requisitos do jogo. Não houve tentativa de contornar bloqueios. A lista de scripts deve ser depurada por domínio e cruzada com comportamento observado antes de atribuir responsabilidades.
