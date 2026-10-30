# Mapa das telas e direção visual — Kurokage

Data: 30/10/2026  
Fonte primária: `docs/reverse-engineering/authenticated-observations-2026-10-29.md` (PR #34), `feature-matrix.md`, componentes reais do repositório e layouts de produção auditados nesta etapa.

## Distinção entre evidência de interface e réplica visual

A PR #34 **visitou 76 rotas do Naruto Game**, mas não significa que suas páginas tenham sido validadas integralmente. Há observações reproduzíveis de **seleção, status, treinamento, graduações, jutsus, temas VIP**; o registro de missão contém uma execução observada.

**Não existem capturas visuais originais do concorrente versionadas em `docs/` nesta revisão**. Os dados sobre composição gráfica, distâncias, textura, ilustrações e paleta exata permanecem insuficientes para uma cópia fiel pixel a pixel.

As páginas externas e o manual histórico são referência para organização e fluxo de RPG. Não se importam logos, arquivos CSS, ilustrações exclusivas, marcas ou textos narrativos protegidos. O Kurokage mantém nome e visual próprio.

## Mapa das áreas documentadas e as telas de produção

| Área visual | Evidência observada no Naruto Game | Telas Kurokage | Prioridade visual |
|---|---|---|---|
| Seleção do ninja | retrato, nível, graduação, vila, Ryous, Vida, Chakra, Stamina; Jogar/Remover | `/selecionar` | Alta — personagem em destaque, métricas secundárias |
| Painel e status | atributos-base e derivados, combates, missões e treino | `/dashboard`, `/status` | Alta — números legíveis e módulos |
| Academia | orçamento de treino, pontos livres/treináveis, seleção de atributo | `/treino` | Alta — contador, custo, ação principal |
| Jutsus | famílias, condições de requisitos, abas avançadas | `/tecnicas`, `/aprimorar-jutsus` | Alta — cartões com estado e filtros |
| Graduação | etapas e requisitos | `/graduacoes`, `/exame` | Média — progresso vertical |
| Missões | categorias, tempo, execução e conclusão | `/tarefas` | Alta — categorias, relógio e recompensa |
| Combates | famílias PvE/PvP, Dojo e Mapa; sem captura autenticada completa | `/dojo`, `/mapa`, `/historia`, `/evento`, `/historico` | Média — não afirmar fidelidade visual ainda |
| Vila e serviços | destinos, loja e sistemas de utilidade visitados, sem fluxo validado completo | `/vila`, `/hospital`, `/ferreiro`, `/ichiraku`, `/templo` | Média |
| Temas VIP | tema adquirido, personagem liberado e tema equipado são estados separados | `/vip`, `AvatarModal` | Média — regras de aquisição futuras |
| Outras áreas | rota visitada, conteúdo parcial | `/ranking`, `/clas`, `/elementos`, `/invocacoes`, `/portoes`, `/equipamentos` | Média |

## Padrões que podemos aplicar com segurança

1. **Casca persistente de RPG:** menu lateral em grupos intuitivos (Personagem, Academia Ninja, Combates e Jornada, Vila e Serviços) e cabeçalho com dados do personagem.
2. **Status sempre visíveis:** Vida, Chakra, Stamina e Experiência com números atuais/máximos e barras de progresso acessíveis. Ryous e Kuro Coins próximos a ações.
3. **Hierarquia previsível:** título de tela, contexto, ação principal e conteúdo em cartões, listas ou tabelas conforme a densidade.
4. **Requisitos legíveis:** estados permitido/bloqueado/concluído, sem depender apenas de cor.
5. **Mobile real:** navegação recolhível, barras em duas colunas, botões alcançáveis, rolagem de menu independente.
6. **Estética original do Kurokage:** carvão, vermelho-selo, ouro envelhecido, tipografia Shippori/Inter/JetBrains. Não existe prova de que esses sejam os códigos de cor usados no Naruto Game.

## Primeira etapa implementada nesta PR

- Reorganização das 25 rotas existentes em seis grupos, sem criação de páginas falsas.
- Menu lateral com seção de personagem, indicadores de área ativa, acessibilidade por teclado e abertura automática do grupo da rota.
- Cabeçalho permanente com status quantificado, moeda e acesso ao inventário.
- `PageHeader` centralizado em classes de estilo reutilizáveis.
- CSS concentrado no layout autenticado em `src/styles/rpg-shell.css`; o cabeçalho compartilhado também estiliza a tela de seleção. A tela de login não foi redesenhada.
- Testes da navegação, integridade de rotas, apresentação numérica de recursos e cobertura mobile.
- **Zero alteração em Supabase, fórmulas de status, preços ou recompensas.**

## O que ainda não podemos afirmar

- Fidelidade pixel-perfect ao Naruto Game ou capturas atuais de todas as 76 rotas.
- Coeficientes de combate, limites de round, valores VIP ou estados de aquisição comparáveis.
- Qualidade do layout autenticado sob um jogador real sem executar uma verificação com sessão legítima.

## Próximos lotes visuais sugeridos

1. Seleção e status: cartões com retrato e duas colunas de status/atributos, copiando a organização funcional observada, com assets próprios.
2. Academia, jutsus e missões: padronizar linhas de requisitos, tabelas, filtros e área de ação.
3. Combate e mapa: requerem referência visual recente para evitar decisões especulativas.
4. Documentar capturas licenciadas/autorizadas em repositório privado ou anexo apropriado, sem publicar dados pessoais de jogadores.
