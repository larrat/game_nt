# Auditoria visual comparativa — Naruto Game × Kurokage
**Data:** 30/10/2026  
**Escopo:** Status, Seleção, Treinamento, Jutsus, Missões e Combate  
**Status:** auditoria parcial, **sem sessão atual autenticada acessível** nesta execução

## 1. Origem e confiabilidade das evidências

| Evidência | É atual? | Confiança / uso permitido |
|---|---|---|
| Site público https://narutogame.com.br/ | Sim, inspecionado em 30/10/2026 | Confirma a landing page, navegação pública, promoção do personagem e identidade textual; **não** revela telas internas |
| Manual básico oficial https://narutogame.com.br/Manual_Basico_Naruto_Game_R10_v1.pdf | **Não:** manual de 2014, capturas de um layout histórico | Confirma padrões conceituais de navegação e organização; **não usar como screenshot do Round 53** |
| Atualização R53 https://www.narutogame.com.br/?id=649&secao=ler_noticia | Publicação de 24/09/2026 | Anuncia indicador de quantidade de turnos de combate NPC/PVP; confirmação de funcionalidade anunciada, não seu posicionamento visual |
| Tema escuro https://www.narutogame.com.br/?id=421&secao=ler_noticia | Registro de 21/03/2022 | Confirma suporte anunciado ao tema escuro; não atesta cores atuais |
| Observações autenticadas anteriores em `docs/reverse-engineering/authenticated-observations-2026-10-29.md` | 29–30/10/2026, sessão anterior | 76 rotas visitadas, mas poucas inspecionadas profundamente e sem imagens originais versionadas |
| Código `master` do Kurokage | 30/10/2026 | Inspeção concreta dos componentes reais; não substitui teste browser autenticado |

**Bloqueio de nova coleta:** a extensão do navegador não disponibilizou a sessão na conexão usada. A tentativa de listar abas falhou com solicitação para originar a conversa do navegador conectado. Não houve acesso à conta do Naruto Game nesta execução, nem interação com autenticação, ações, missões ou progressão.

## 2. O DNA de interface que vale adaptar — com artes e código próprios

O manual histórico exibe painéis de madeira escura, divisórias com títulos em faixas, ícones e barras com métricas, tabelas de missões com coluna de recompensa e janelas de combate de dois personagens, cronômetro e faixa inferior de técnicas. **Não se deve importar CSS, imagens, logos, retratos de Naruto nem materiais licenciados do concorrente.** Essas observações orientam *hierarquia, densidade de informação e fluxo*, com tema original do Kurokage (carvão, vermelho-selo, ouro, grafismos próprios).

**Princípios UI comuns:**
1. Colocar personagem, nível, graduação e recursos essenciais à vista.
2. Diferenciar dados do personagem, ações disponíveis e progresso com separadores constantes.
3. Exibir valores numéricos, custo, duração, bloqueio e consequência antes da confirmação.
4. Fazer visível a relação entre atributos, requisitos e técnicas.
5. Manter interface usável sem hover: teclado, toque, estados foco/seleção, `prefers-reduced-motion`.
6. Revalidar **todas** as decisões de economia e combate no servidor; animação não pode decidir ganho ou ação.

## 3. Matriz de lacunas e especificação de melhorias

| Prioridade | Área / arquivos Kurokage | Evidência do concorrente | Situação verificada no nosso código | Recomendação executável |
|---|---|---|---|---|
| P0 | **Status** `src/pages/Status.jsx` | Manual p. 4: jogador, resumo combate, missões concluídas, atributos base e fórmulas derivadas; sessão anterior confirma contadores | Status atual tem retrato, barras de recursos, informações gerais e cartões de poderes; diversas estatísticas no bloco de conta são zeros **literais** como dias no round e pacotes abertos. Não há seção completa dos 10 atributos/13 derivados observados | Adicionar seção de atributos básicos e derivados baseada em `engine.js`; exibir `Não disponível` onde não houver fonte real, nunca zeros fictícios; destacar graduação e avatar |
| P0 | **Combate** `src/pages/Combate.jsx` | Manual p. 24–25: combatentes opostos, vida/chakra/stamina, cronômetro, ações por categoria, custo/cooldown; R53 anuncia contagem de turnos | O JSX contém arena `combat-arena`, log central, contador de tempo, abas e barra de técnicas; arquivo é extenso e já tem lógica sensível | **Primeiro só UI:** badge `Turno X`, estados `Minha vez/Aguardando`, custo e cooldown visíveis, melhores retratos e log recolhível; não ajustar cálculo de combate |
| P1 | **Treinamento** `src/pages/Treino.jsx` | Manual p. 10: contador, quantidade, custo e progresso; sessão 2026 registra pontos livres, treináveis, limite e resultado de Energia | Há saldo de pontos, limite por operação, contador de treinos, seleção de atributo, estimativa e confirmação | Unificar painel de saldo, atributo e impacto antes/depois em dois blocos; representar claramente `estimativa` vs `resultado confirmado`; não importar multiplicadores concorrentes |
| P1 | **Jutsus** `src/pages/Tecnicas.jsx` e `src/components/JutsuCard.jsx` | Manual p. 12: tabs por família, agrupamento, ícone, requisitos e Treinar; sessão 2026 registra abas adicionais | Academia 2.0 tem busca, filtros, contagem, bloqueios e compra em massa | Layout em lista/cartão denso com imagem, tipo, requisito detalhado, custo e ação; estado `aprendido/disponível/bloqueado` testado; ícones originais |
| P1 | **Missões** `src/pages/Tarefas.jsx` | Manual p. 5–6: abas tipo/rank, descrição, duração, recompensa, nível e status; sessão anterior executou Primeira Lição com valores efetivos distintos do catálogo | Existem abas por rank, slots, missões ativas, tabela de XP/Ryous, bloqueios e conclusão | Destacar missões ativas e relógio, agrupar categorias; diferenciar *recompensa anunciada* de *recompensa liquidada* e nunca exibir bônus não confirmado |
| P2 | **Seleção** `src/pages/Selecionar.jsx` | Manual p. 3: escolha, Jogar, Remover; sessão 2026 confirma nome, vila, rank, moedas e recursos | PR #44 já implementou modelo `characterPresentation.ts`, retrato, barras nativas, ações e CSS responsive | **Não duplicar PR #44**: adicionar navegação com Motion, foco/teclado, loading/erro; testar 0, 1 e múltiplos personagens |
| P2 | **Navegação global** `Sidebar.jsx`, `TopBar.jsx` | O layout antigo e observações de rotas mostram menus por áreas e status persistente | PR #42 criou seis grupos e barras; PR #43 adicionou Motion e TypeScript progressivo | Manter consistente, não reformular novamente sem screenshots 2026 autenticados |

## 4. Especificações de microinteração

### Status
- Cabeçalho: nome, graduação, clã, vila, nível, retrato com botão de trocar avatar.
- Recursos: Vida/Chakra/Stamina/XP usando o utilitário tipado existente, com `<progress>` e valores atuais/máximos.
- Atributos base / derivados: mesma referência `engine.js`; descrições pequenas para origem dos valores; não inventar números.
- Contadores: somente métricas existentes no banco. Campos não implementados ficam explicitamente indisponíveis.
- Motion: entrada discreta (250–350 ms), sem loop, desabilitada conforme preferência do sistema.
- Compatibilidade: foto/fallback, valores 0 válidos, mobile 320px, teclado, modal de avatar.

### Academia e missões
- Linha visual: `ícone | nome e descrição | requisito/custo | status | ação`.
- Agrupamento por graduação/categoria, sem perder a busca atual e o acesso a detalhes bloqueados.
- Ações em loading, sucesso e erro usam retorno confirmado da RPC. Nunca simular compras ou recompensas.

### Combate
- Hierarquia: `Turno e cronômetro` → `combatentes com barras` → `log conciso` → `técnicas e custos`.
- Ação indisponível deve indicar motivo: turno errado, chakra/stamina insuficiente, cooldown, sessão finalizada.
- Animação apenas no resultado confirmado (hit, esquiva, dano), não antes da resolução autoritativa.
- Mobile: ações com alvos confortáveis, jutsus em faixa horizontal rolável e log expansível.

## 5. Plano de implementação com entregas verificáveis

**Fase A — Status 3.0 (P0):** consolidar retrato e métricas verídicas; remover placeholders enganadores; introduzir atributos base/derivados com testes de cálculo, loading e responsividade. Validar sem tocar nos RPCs.

**Fase B — Academia 3.0 (P1):** padronizar uma linha/cartão reutilizável para requisitos de missões e jutsus, reaproveitando critérios já protegidos no Supabase. Introduzir Motion apenas onde ajuda a leitura.

**Fase C — Combate 2D interface (P0):** reorganizar o combate existente primeiro; protótipo Phaser **isolado** só após observação autenticada da versão atual e teste de desempenho. O resultado nunca pode ser decidido no cliente.

**Fase D — Prova visual:** coletar via navegador legitimamente conectado capturas desktop 1440px e mobile 390px por tela, com dados de conta protegidos; inspecionar menu, status, treino, abas de jutsu, missões e arena. Comparar *hierarquia*, *densidade*, *estados* e *acessibilidade*, não pixels proprietários.

## 6. Critérios de aceitação

- Nenhuma alteração em saldo, XP, drops, regras de rank, dano, recompensas ou permissões do banco.
- `npm ci`, `npm test`, `npm run build` passam.
- Nenhum dado fictício mostrado como dado real (especialmente Status).
- Ações de jogo usam respostas verificadas do Supabase.
- Menus e componentes funcionam com teclado e toque, em 320px/390px/768px/1440px, com contraste e redução de movimento.
- Tela de combate permanece responsiva em batalha longa e sem renderizações excessivas do log.
- Revisão autenticada manual documentada **separadamente**; não marcar concluída sem evidência.

## 7. Limites: o que NÃO está confirmado

- Cores, fontes, dimensões exatas, layout atual desktop/mobile e animações do Round 53 dentro da conta autenticada.
- Regras efetivas de atributo, treino e jutsu em todos os ranks; há apenas uma amostra de Energia na coleta anterior.
- Configuração atual de combate, consumo e cooldown para personagens avançados.
- Equivalência funcional ou visual integral das 76 rotas antes inspecionadas.

Este documento é uma **auditoria de UX e backlog de design**, não uma alegação de engenharia reversa do código do concorrente nem réplica pixel a pixel.
