# Matriz funcional — Naruto Game x Kurokage

> **Nota de versão (30/10/2026):** matriz histórica de comparação funcional produzida antes das PRs #34–#41. As observações visuais atuais estão em [observações autenticadas](authenticated-observations-2026-10-29.md) e no [mapa das telas](../design/screen-catalog-and-visual-direction-2026-10-30.md). As avaliações de segurança abaixo retratam código antigo e **não devem ser interpretadas como vulnerabilidades presentes no Supabase atual**.


Legenda: **Presente** = há código relacionado no Kurokage; **Parcial** = parte do fluxo existe, mas há divergência ou validação pendente; **Não confirmado** = evidência pública insuficiente para declarar equivalência.

| Área/sistema | Evidência pública do Naruto Game | Implementação no Kurokage | Status e observações |
|---|---|---|---|
| Atributos-base | A Calculadora Ninja lista Ninjutsu, Taijutsu, Bukijutsu, Genjutsu, Agilidade, Selo, Força, Energia, Inteligência e Resistência. [Fonte](https://www.narutogame.com.br/index.php/support?secao=calculadora) | src/utils/engine.js calcula derivados a partir de atributos equivalentes. | **Presente.** Não usar as fórmulas do Kurokage para afirmar que são as do Naruto Game; faltam valores observados no jogo atual. |
| Nível/experiência | O manual explica progressão e requisitos de nível. [Manual R10](https://www.narutogame.com.br/Manual_Basico_Naruto_Game_R10_v1.pdf) | calculateXPForLevel, calculateLevelFromXP e calcular_level_por_xp no SQL. | **Parcial.** Curvas duplicadas entre cliente e banco precisam de testes de igualdade e limites. |
| Graduações | Manual associa graduação a requisitos e acesso a sistemas. | Bônus por graduação no engine.js; páginas Graduações e Exame. | **Presente.** Requisitos e promoções atuais precisam ser mapeados em cenário real. |
| Clãs/passivas | Calculadora pública permite selecionar clã; notícias antigas documentam revisões de clãs. | CLAN_PASSIVES em engine.js, src/pages/Clas.jsx e bônus também na RPC de combate. | **Parcial.** Passivas e valores podem divergir entre cliente e SQL. |
| Elementos | Calculadora pública apresenta elementos/selos como parte da construção do personagem. | src/pages/Elementos.jsx e getElementalMultiplier em engine.js. | **Parcial.** Cliente implementa ciclo elemental de cinco elementos e relações físicas; RPC de combate não implementa a matriz completa. |
| Aprendizado de jutsus | Manual R10: jutsus podem exigir atributos, graduação e nível; há custos para aprender e utilizar. [PDF](https://www.narutogame.com.br/Manual_Basico_Naruto_Game_R10_v1.pdf) | src/pages/Tecnicas.jsx, tabela jutsus, RPCs aprender_jutsu e aprender_jutsus_massa. | **Parcial.** RPC legada aceita custo informado pelo cliente; conferir requisitos e prevenção de duplicidade no banco. |
| Aprimoramento de jutsus | As fontes consultadas não confirmam equivalência exata com o sistema do Kurokage. | src/pages/AprimorarJutsus.jsx e getJutsuEnhancementBonus em engine.js; RPC modificar_jutsu_slots. | **Presente no Kurokage; equivalência não confirmada.** |
| Treinamento de atributos | Manual antigo relaciona pontos e atributos; notícias históricas descrevem alterações nos pontos e no treinamento. | src/pages/Treino.jsx; RPC treinar_atributo na migração 009. | **Parcial.** RPC aceita p_hero_min e p_hero_max do cliente e não valida auth.uid() no código observado. |
| Equipamentos/inventário | A página do manual inclui tutorial de compra de equipamentos e armas. | src/pages/Equipamentos.jsx, src/pages/Ferreiro.jsx, src/utils/lootEngine.js. | **Presente.** Venda em massa apaga itens e credita ryous em chamadas separadas do cliente; pode haver corrida/abuso se RLS permitir. |
| Missões temporizadas | Manual documenta missões e requisitos; notícias antigas registram validação de rank/graduação ao aceitar missão. | src/pages/Tarefas.jsx; RPCs iniciar_missao e finalizar_missao. | **Parcial.** Duração e recompensas são enviadas pelo cliente; finalizar_missao não verifica propriedade com auth.uid() no código observado. |
| História/quests | Não há evidência pública atual suficiente para afirmar equivalência com o fluxo narrativo Kurokage. | src/pages/Historia.jsx; migrations/022_story_quests.sql. | **Presente no Kurokage; risco alto.** concluir_story_quest é SECURITY DEFINER e não verifica propriedade nem objetivo concluído no corpo da função. |
| Dojo e PvE | Manual público tem tutorial de luta no Dojo. [Manual](https://www.narutogame.com.br/?secao=manual) | src/pages/Dojo.jsx, src/pages/Combate.jsx, migrations/001_combat_rpc.sql. | **Presente.** RPC recebe payloads de cliente e estado de batalha é mantido no frontend; autoridade e consistência precisam de revisão. |
| PvP e pareamento | Manual antigo documenta modalidades PvP e batalhas de equipe. [PDF](https://www.narutogame.com.br/Manual_Basico_Naruto_Game_R10_v1.pdf) | getPvPMatchRules em engine.js e fluxos de combate relacionados. | **Parcial.** Regras locais de pareamento existem; resolução autoritativa requer teste ponta a ponta. |
| Mapa/vilas/viagem | Manual documenta mapa da vila e mapa mundi; acesso pode depender da graduação. | src/pages/Mapa.jsx e RPC viajar_mapa. | **Parcial.** RPC usa IF v_user_id != auth.uid(); a comparação pode não rejeitar ausência de usuário por causa de NULL, conforme grants. Também recebe custo do cliente. |
| World Boss/eventos | Notícias R53 documentam alterações e limites de recompensa. [R53](https://www.narutogame.com.br/?id=649&secao=ler_noticia) | src/pages/Evento.jsx, tabela world_boss_damage e migrations/015_world_boss_and_dojo.sql. | **Parcial.** Frontend envia valores de dano ao banco; revisar validação, atomicidade e distribuição única de recompensa. |
| Loja/economia/moeda premium | Documentação pública menciona compras e histórico de créditos em notícias históricas. | Várias páginas manipulam ryous, vip_coins e inventário. | **Parcial.** Mutação econômica deve ocorrer em transação no banco; preço/recompensa devem derivar de dados autoritativos. |
| Talentos, invocações e Modo Sennin | A Calculadora Ninja pública inclui invocação, selo, portão e Modo Sennin. | src/pages/Invocacoes.jsx, src/pages/Templo.jsx e lógica de portões no engine.js. | **Presente em partes.** Requisitos/fórmulas atuais do Naruto Game precisam de validação. |
| Temporadas/rounds | A notícia R53 publicada em 24/09/2026 lista mudanças para o round. [R53](https://www.narutogame.com.br/?id=649&secao=ler_noticia) | Não foi encontrada camada única de round/season na amostra inspecionada. | **A verificar.** Definir se Kurokage precisa de temporada, reset parcial e calendário de recompensas. |

## Evidências recentes separadas do manual histórico
A notícia oficial do Round 53, publicada em 24/09/2026, informa:
- sorteios que consideram jogadores ativos nas últimas 24 horas;
- limite de 100 fragmentos de caçada ninja;
- incentivo de experiência e ryous para Jounin com mais de 35 dias de jogo;
- contador de turnos em combates NPC e PvP.

Isso confirma que o Naruto Game continua sendo ajustado; números/regulamentos do manual R10 não devem ser presumidos atuais. Consulte a [notícia R53](https://www.narutogame.com.br/?id=649&secao=ler_noticia).

## Prioridades
1. **P0 — Autorização e economia:** verificar RLS/grants, impedir mutação de personagens alheios e retirar autoridade de recompensa do cliente.
2. **P1 — Fonte única das fórmulas:** alinhar engine JavaScript e RPC SQL com testes de caracterização.
3. **P1 — Integridade de missões e boss:** recompensas calculadas no servidor, conclusão idempotente e validação de proprietário.
4. **P2 — Paridade de gameplay:** comparar requisitos, custos, cooldowns e regras atuais do Naruto Game usando sessões autorizadas.
