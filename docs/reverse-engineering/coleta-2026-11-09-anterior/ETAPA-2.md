# Etapa 2 — fluxos internos, requisitos e verificações

09/11/2026. Escopo: ampliar as páginas iniciais já coletadas com estados internos de História, objetivos, recompensas, prévia de reforja e categorias adicionais da academia. Não houve luta, compra, alteração de build ou reforja nesta etapa.

## Cobertura adicional

- 4 estados de saga e 36 capítulos de História abertos na conta atual.
- 3 abas de objetivos: Diários, Semanais e Globais.
- 8 abas do histórico de recompensas.
- Prévia de seleção de equipamento na reforja, sem confirmar ação.
- 6 categorias adicionais de academia, com 38 cartões recuperados: Elementais 6; Portão 10; Karma 10; Clã 3; Kinjutsus 4; Medicinais 5. Não são catálogos universais: dependem da build, classe, conhecimentos e desbloqueios do SubZero.

## Regras observadas/documentadas

### Precisão dos jutsus

Comparação numérica dos 41 cartões da etapa anterior: todos os percentuais exibidos são compatíveis com `min(100, precisao_atual / precisao_requerida * 100)`, com discrepância inferior a 0,011 ponto percentual. Evidência mais forte para a fórmula de apresentação, mas não valida o cálculo efetivo contra adversário, modificadores de combate ou distribuição de sorteios. Dados em jutsus-subzero.csv.

### Objetivos

A interface declara um novo objetivo diário por dia e um novo semanal aos domingos, ambos acumulando no máximo 3. Horário/fuso e semântica de reposição ainda não testados.

| Período | Objetivo observado | Progresso | Recompensa |
| --- | --- | --- | --- |
| Diário | Comprar 1 Tema VIP | 0/1 | 1000 pontos de treino total |
| Diário | Vencer 2 Mapa PVP | 1/2 | 1 ponto de aprimoramento de jutsu |
| Diário | Fazer 10 reforjas | 0/10 | 1000 ryous |
| Semanal | Aprender 3 clãs | 0/3 | 1 tema VIP aleatório |
| Semanal | Comprar 50 armas de longo alcance | 40/50 | 3000 pontos de treino total |
| Global | Fazer 5000 reforjas | 1228/5000 | 500 fragmentos de equipamento |

Há divergência: o texto introdutório diz Globais (Em breve), mas a aba Global já exibe objetivo e progresso. Tratar como comportamento observado e inconsistência editorial. Não concluir, só pelo plural do texto, se o contador é coletivo. Trocar objetivo é uma ação disponível; custo, disponibilidade e reposição não foram testados.

### História

Hierarquia observada: saga → capítulo → adversário. Cada adversário pode aparecer derrotado, disponível para Duelar ou sem botão disponível. Ausência de botão não basta para explicar o motivo do bloqueio: requisitos precisam ser lidos individualmente.

Na conta, País das Ondas apresenta Mizuki Touji, Gouzu, Meizu, Haku e Zabuza Momochi derrotados. Em Invasão de Pein, Konan aparece derrotada e Chikushodo disponível para duelo. Os demais inimigos são listados sem botão disponível nessa captura. Nenhum duelo de História foi iniciado.

Na prévia observada de Reunião dos Kages, um tooltip explicita graduação Jounin ou maior, nível 31 ou maior e NPC Suigetsu Hoozuki morto. Esse requisito pertence ao elemento que abriu o tooltip; não deve ser atribuído a todos os NPCs do capítulo.

Para implementação própria, modelar dependência entre NPCs como grafo de pré-requisitos, permitindo condições de graduação, nível e derrotas anteriores. O grafo completo ainda não foi provado apenas pela ordem visual da lista.

### Técnicas especiais

Portão da velocidade: buff documentado com Incremento de Crítico +15 e Concentração +15; custo 2 chakra/22 stamina; intervalo 98 e duração 99 turnos. Exige graduação Genin, 1º Portão e pelo menos 5 em Taijutsu OU Bukijutsu.

Transformação otsutsuki: buff com os mesmos dois bônus, mas custo 22 chakra/2 stamina; intervalo 98 e duração 99. Exige graduação Genin, Karma Estágio 1 e pelo menos 5 em Ninjutsu OU Genjutsu.

Tsukuyomi disponível para aprendizado: ataque +166, custo de combate 192/32 e intervalo 7. Exige selo 22, inteligência 27, graduação ANBU, Mangekyou Sharingan, clã Uchiha e 36 em Ninjutsu OU Genjutsu. A conta atual é Jounin: presença do cartão não significa elegibilidade para aprender.

Edo Tensei exige Especialização Mestre Kinjutsu nível 1. Chiyute no Jutsu exige selo 8, graduação Genin e Especialização Mestre Medicinal nível 1. Separar posse de especialização, graduação e atributos em regras independentes.

Os valores acima são os exibidos na build atual, não garantidamente valores base de todas as classes. O intervalo/duração dos buffs foi documentado, não testado por 99 turnos.

### Reforja

A interface permite selecionar equipamento, favoritar, Reforjar por 20 fragmentos e Travar atributo. O custo 20 pertence à prévia selecionada; não generalizar a todas as raridades ou bloqueios. Não houve confirmação de reforja, favorito ou travamento. Distribuição de atributos, quantidade de fragmentos consumida ao travar e preservação de atributos seguem pendentes.

## Contratos de regras sugeridos para o game_nt

As estruturas abaixo são propostas, não nomes de tabelas/rotas extraídos do original.

- Requirement: kind, operator, threshold, reference, group_operator. Suportar AND entre graduação/nível/clã/item e OR entre alternativas de atributo.
- StoryChapter: saga, ordem_exibicao, recompensas_de_conclusao, npc_encounters. Não inferir dependência somente pela ordem.
- StoryEncounter: npc_id de catálogo, requisitos, derrotado_em, estado_de_elegibilidade e motivos.
- ObjectiveDefinition: scope, cycle, metric, threshold, reward; ObjectiveInstance: progresso, recebido_em, trocado_em, concluido_em, resgatado_em.
- BuffDefinition: efeitos tipados, custos separados por recurso, intervalo, duração, escopo de combate e condições de desbloqueio.
- ReforgePreview: equipamento, custo, atributos_travados, moeda/fragmento, version. A transação de reforja deve validar novamente o custo e a posse no servidor.

## Pendências e bloqueios concretos

1. Outros estados de aprendizado exigem graduação e requisitos que a conta não possui. Não evoluir a conta nem mudar sua build somente para preencher catálogo.
2. Validar dano e efeitos exige mais lutas comparáveis; a fórmula de apresentação de precisão não encerra o motor de combate.
3. Validar aprendizagem, reforja e troca de habilidades exige consumo ou alteração de recursos/build. As prévias foram extraídas; essas transações ainda não foram realizadas.
4. Equipe, organização e PVP exigem participação e permissões adicionais; não enviar convites ou mensagens para testar.
5. Separar ausência de dados, conteúdo bloqueado e carregamento transitório. Não rotular como inexistente só porque uma aba está vazia.

## Rastreabilidade

etapa-2-evidencias.json preserva os 58 estados coletados. historia-capitulos.csv lista os 36 capítulos e seus estados visíveis. academia-adicional.csv preserva os 38 cartões com requisitos. O relatório original permanece como registro da etapa anterior; esta etapa amplia sua cobertura e deve ser lida em conjunto.
