# Naruto Game — engenharia reversa funcional

Versão 0.1 — 09/11/2026. Conta observada: SubZero, Jounin, nível 28, Vila da Folha.

## Resultado e alcance

Este dossiê reúne uma especificação funcional inicial e as evidências da interface autenticada. Não representa acesso ao código do servidor ou ao banco de dados. A engenharia reversa total continua aberta: os estados bloqueados por progressão, as transações e as fórmulas probabilísticas exigem observações adicionais. A cobertura não deve ser descrita como 100% concluída.

Foram mapeadas 96 entradas únicas de menu na primeira coleta, 94 páginas visitadas e 2 entradas reservadas. Nesta investigação foram revisadas 90 entradas para conteúdos auxiliares, coletadas 569 ocorrências de tooltip (não necessariamente únicas), 19 estados de abas de conquistas, 41 cartões de jutsus do personagem e 124 cartões de técnicas disponíveis para aprendizado nas quatro classes. As listas são específicas da conta e podem omitir técnicas já aprendidas, classes ou conteúdos bloqueados.

## Como interpretar a confiança

| Marca | Significado |
| --- | --- |
| Observado | Valor, mensagem ou estado exibido na interface |
| Documentado | Regra declarada pelo próprio jogo; execução ainda pode diferir |
| Inferido | Hipótese compatível com as observações disponíveis |
| Proposto | Arquitetura sugerida para o game_nt; não é descoberta do servidor original |
| Pendente | Ainda sem evidência suficiente |

Cada catálogo preserva texto de origem. Custos e ataque podem refletir a build e os aprimoramentos do personagem: não tratá-los automaticamente como valores base universais.

## Descobertas principais

1. A missão concluída bloqueava parte dos menus. Após Finalizar, as opções completas voltaram. A conta passou de 9 para 10 missões Rank B concluídas. A recompensa exibida foi 1.760 EXP e 1.320 ryous. O momento exato de crédito e a idempotência no servidor não foram isolados em teste.
2. O Dojo NPC declara limite de 10 combates diários e reinício à meia-noite. A interface mostrou 0/10 e Sasuke Uchiha. O fuso do reset não foi confirmado.
3. O Dojo PVP declara limite até nível 9. O modo de treinamento declara não dar contadores, experiência ou ryous e não gastar os recursos ao término.
4. A academia declara requisitos dobrados para jutsus de outra classe. Medicinais e Kinjutsus são documentados como restritos a batalhas de equipe 4x4 e 4x1.
5. O treinamento de jutsus declara pontos a partir do nível 5 e 3 pontos por nível. A conta exibe 2 livres e 86 usados. A regra exata de concessão, inclusive bônus, não foi deduzida apenas desses totais.
6. Existem três slots visuais de aprimoramento nos jutsus observados. Os efeitos podem variar conforme o slot e aumentar o consumo de chakra. Textos originais dos modificadores foram preservados.
7. A extração inicial omitia atributos expressos por ícones e detalhes de tooltip. Por isso, não se pode implementar as fórmulas usando somente os números do primeiro arquivo.

## Fórmulas documentadas na classe observada

Os símbolos abaixo foram recuperados dos ícones renderizados. Correspondências de ícones são explícitas quando reconhecíveis; nomes de arquivos antigos não comprovam sozinhos o nome atual do atributo.

| Grandeza | Expressão/documentação |
| --- | --- |
| Vida | Energia * 8 |
| Chakra | Energia * 4 + ( Ninjutsu ) * 7 + ( Genjutsu ) * 20 |
| Stamina | Energia * 4 + ( Taijutsu ) * 7 + ( Bukijutsu (ícone ken) ) * 7 |
| Ataque ( Tai / Buk ) | ( Força / 2 ) |
| Ataque ( Nin / Gen ) | ( Inteligência / 2 ) |
| Defesa ( Nin / Gen) | ( Resistência/defesa (ícone defense) / 2 ) |
| Defesa ( Tai / Buk) | ( Resistência/defesa (ícone defense) / 2 ) |
| Precisão | Selo? (ícone conhe; nome atual a confirmar) * 1 |
| Perfuração | Agilidade * 1 |
| Incremento de Absorção | Estudante e Genin: 40%, Chunin: 30%, Jounin, ANBU, Sannin e Herói: 15% |
| Incremento de Crítico | Estudante e Genin: 40%, Chunin: 30%, Jounin, ANBU, Sannin e Herói: 15% |
| Determinação | Estudante e Genin: Level do player, Chunin: Level do player / 1.5, Jounin: Level do player / 2, ANBU: Level do player / 3, Sanin e Heroi: Level do Player / 4 |
| Poder Ninja | ( Energia ) * 200 + ( Força + Inteligência + Resistência/defesa (ícone defense) ) * 150 + ( Ninjutsu + Genjutsu + Taijutsu + Bukijutsu (ícone ken) ) * 200 + ( Agilidade + Selo? (ícone conhe; nome atual a confirmar) ) * 100 |

Essas expressões não recompõem sozinhas os máximos da conta. Há componentes base, progressão, equipamentos e outros bônus ainda não isolados. Por exemplo, 22 Energia base e +8 bônus não explicam os 2.197 de vida apenas pelo multiplicador 8. Ataque mágico de 35 (+19) também exige confirmar ordem e arredondamento. Não substituir valores por uma fórmula adivinhada.

Para a chance de acerto há um exemplo compatível com `min(100, precisão_atual / precisão_requerida × 100)`: 42/48 = 87,5%. Isso é uma hipótese de fórmula de apresentação, não validação da probabilidade final contra inimigos.

## Jutsus do SubZero

Os valores de ataque são bônus exibidos, não dano efetivo garantido. A interpretação dos dois custos foi conferida pelos ícones de chakra e stamina. A chance de tooltip pode não incluir toda a defesa/efeitos do adversário.

| Jutsu | Ataque | Chakra | Stamina | Intervalo | Acerto exibido | Ativo |
| --- | --- | --- | --- | --- | --- | --- |
| Kamui | 74 | 86 | 14 | 3 | 100.0% | False |
| Yasaka no Magatama - Lvl 3 | 182 | 215 | 30 | 7 | 91.3% | True |
| Kishibari no Jutsu | 16 | 18 | 3 | 1 | 100.0% | False |
| Katon no Jutsu | 24 | 26 | 3 | 1 | 100.0% | False |
| Katon Daiendan no Jutsu | 41 | 48 | 8 | 3 | 100.0% | False |
| Raiton no Jutsu | 24 | 26 | 3 | 1 | 100.0% | False |
| Raiton Denki Kunai | 41 | 48 | 8 | 3 | 100.0% | False |
| Raiton Raishi - Lvl 3 | 68 | 71 | 10 | 3 | 100.0% | False |
| Izanagi - Lvl 3 | 78 | 86 | 12 | 3 | 100.0% | True |
| Kasumi Juuha no Jutsu | 20 | 22 | 4 | 1 | 100.0% | False |
| Kokoroyoru no jutsu - Lvl 1 | 38 | 36 | 6 | 1 | 100.0% | False |
| Tazuneru no Jutsu - Lvl 2 | 51 | 50 | 7 | 3 | 100.0% | False |
| Bakuon no Jutsu - Lvl 3 | 55 | 53 | 7 | 3 | 100.0% | False |
| Katon Haisekishou - Lvl 1 | 60 | 65 | 10 | 3 | 100.0% | False |
| Sensei Hana Kyouka Sai - Lvl 3 | 68 | 71 | 10 | 3 | 100.0% | True |
| Kotoamatsukami - Lvl 3 | 132 | 150 | 21 | 5 | 100.0% | True |
| Katon Housenka no Jutsu | 61 | 70 | 18 | 3 | 100.0% | False |
| Katon Kasumi Enbu no Jutsu | 69 | 79 | 20 | 3 | 100.0% | False |
| Katon Goukakyuu Chakra no jutsu | 75 | 87 | 22 | 3 | 100.0% | False |
| Katon Bushin Katai - Lvl 3 | 107 | 117 | 24 | 3 | 100.0% | True |
| Raiton Odori Rakurai no Jutsu | 61 | 70 | 18 | 3 | 100.0% | False |
| Raiton Raikyuu | 69 | 79 | 20 | 3 | 100.0% | False |
| Raiton Chidori | 75 | 87 | 22 | 3 | 100.0% | False |
| Raiton Raiden - Lvl 3 | 107 | 117 | 24 | 3 | 100.0% | True |
| Ninpou Hyakka Ryoran | 55 | 62 | 10 | 3 | 100.0% | False |
| Kokohi no Jutsu - Lvl 3 | 103 | 111 | 15 | 5 | 100.0% | True |
| Kori Shinchuu no Jutsu | 64 | 74 | 12 | 3 | 100.0% | True |
| Oto no Gen | 73 | 84 | 14 | 5 | 100.0% | False |
| Sensei Oto no Gen - Lvl 3 | 110 | 120 | 17 | 5 | 100.0% | True |
| Katon Endan no Jutsu | 116 | 133 | 33 | 5 | 100.0% | True |
| Katon Kaizen no Jutsu | 104 | 120 | 30 | 5 | 100.0% | True |
| Katon Ryuuka no Jutsu - Lvl 3 | 153 | 172 | 35 | 5 | 100.0% | True |
| Raiton Meshirai no Jutsu | 116 | 133 | 33 | 5 | 100.0% | True |
| Raiton Chidori Nagashi | 104 | 120 | 30 | 5 | 100.0% | True |
| Raiton Habateku Chidori - Lvl 3 | 153 | 172 | 35 | 5 | 100.0% | True |
| An no Genjutsu | 90 | 103 | 17 | 5 | 100.0% | True |
| Karasu no Genjutsu | 99 | 114 | 19 | 5 | 100.0% | True |
| Mateki Mugen Onki | 114 | 132 | 22 | 7 | 95.45% | True |
| Izanami - Lvl 2 | 143 | 161 | 23 | 5 | 100.0% | True |
| Hyakka Ninpou • Hanachiri Nuko | 114 | 132 | 22 | 7 | 95.45% | True |
| Sensei Kokohi Deboa - Lvl 3 | 150 | 170 | 23 | 7 | 87.5% | True |

### Orientação provisória de combate

Izanami Lvl 2 mostra ataque +143, custo 161 chakra/23 stamina, intervalo 5 e acerto 100%. Kotoamatsukami Lvl 3 mostra +132, 150/21, intervalo 5 e 100%. Sensei Kokohi Deboa Lvl 3 mostra +150, 170/23, intervalo 7 e 87,5%. O produto simples ataque × acerto do último é 131,25, inferior a 143; essa conta serve apenas como comparação aproximada do bônus, não como dano esperado real.

Izanagi Lvl 3 (+78, 86/12, intervalo 3) e Sensei Hana Kyouka Sai Lvl 3 (+68, 71/10, intervalo 3) são candidatos a preencher turnos. A rotação ótima não está comprovada: precisa registrar a disponibilidade por turno, efeitos ativos, defesa inimiga e dano real. Não foram alterados os jutsus ativos nem os aprimoramentos.

Antes de cada luta, conferir vida=vida máxima, chakra=chakra máximo e stamina=stamina máxima, conforme preferência do usuário. Recuperar entre lutas. Não confundir começar full com permanecer full durante o combate.

## Modelo funcional por módulo

| Módulo | Estrutura observada | Investigação pendente |
| --- | --- | --- |
| Personagem e progressão | Nível, EXP, graduação, atributos, derivados e contadores | Tabela de curvas de EXP; bases; arredondamentos; desbloqueios |
| Academia | Quatro classes; aprendizagem, requisitos e treinamento | Custos base; tempos; evolução e efeitos em classes distintas |
| Combate | NPC/PVP, precisão, recursos, intervalos e equipamentos | Ordem das ações; fórmula de dano; crítico; absorção; empates; desconexão |
| Missões | Ranks, condições, estado ativo, conclusão e recompensa | Elegibilidade por estado; falha; cancelamento; concorrência de finalização |
| Economia e lojas | Ryous, créditos, itens, pacotes, recuperação e reforja | Débito/crédito atômico; taxas; probabilidades; preços por estado |
| Habilidades | Clãs, elementos, portões, bijuus, invocação, selo e karma | Exclusões mútuas; requisitos completos; custo de troca; efeitos acumulados |
| História e desafios | Arcos, etapas e tooltips de objetivos | Pré-requisitos completos; replay; recompensa única vs repetível |
| Social | Equipe, organização, especialização, missões e eventos | Papéis; permissões; quorum; recompensa coletiva e participação |
| Vila e guerra | Objetivos, eleições, eventos, invasão e guerra | Pontuação, janelas de participação e regras entre vilas |
| Retenção e VIP | Conquistas, fidelidade, passe, temas e benefícios | Ciclos, expiração, contadores, recebimento repetido e mudança de round |
| Rankings | Ninja, equipe, organização, batalhas e outros | Pesos completos, atualização, empate, paginação e período |

## Fluxos reconstruídos e estados pendentes

### Missão

Modelo proposto: disponível → elegível → ativa → tempo/objetivo atendido → pronta para finalizar → concluída. Cancelada e falha são estados a observar. Confirmado nesta conta: tela de sucesso e botão Finalizar, alteração do contador Rank B e retorno de menus. Pendente: quando o saldo é creditado, prevenção de finalização dupla e exclusividade de missão ativa.

### Jutsu

Modelo proposto: não aprendido → requisitos atendidos → aprendizado → aprendido → evolução → equipado para exibição em luta. Os slots de aprimoramento são modificadores separados. Checkbox de exibição não deve ser confundido com posse, evolução ou capacidade de usar uma técnica.

### Combate

Modelo proposto: elegibilidade → adversário/fila → combate ativo → seleção da ação → validação de custo e intervalo → resolução → resultado → recompensa e recuperação. Foi observada uma luta NPC completa em 11 ações, com vitória; ver COMBATE.md. A fórmula geral de resolução ainda é pendente.

## Estrutura sugerida para implementação no game_nt

Esta seção é proposta de engenharia; nomes e entidades não foram extraídos do banco original.

| Entidade | Campos/relação mínimos |
| --- | --- |
| Character | account, round, class, village, level, graduation, xp, status_version |
| AttributeSnapshot | base, equipment_bonus, skill_bonus, effective, formula_version |
| JutsuDefinition / JutsuRank | class, graduation, requirements, costs, interval, effects, version |
| CharacterJutsu / JutsuEnhancement | rank, show_in_battle, slots, modifiers |
| Battle / BattleParticipant / BattleTurn | mode, state, resources, action, sequence, resolved_events |
| MissionDefinition / MissionRun | requirements, objectives, timer, state, rewards, finalized_at |
| Wallet / LedgerEntry | currency, amount, source, idempotency_key, created_at |
| ItemDefinition / InventoryItem | type, quantity, equipment_roll, owner, equipped_slot |
| Team / Guild / Membership | role, permissions, specialization, joined_at |
| DailyCounter / AchievementProgress | period_key, timezone, metric, value, claimed |
| CatalogEvidence | source_url, observed_at, account_context, confidence, raw_text |

Contratos propostos: listar catálogo e elegibilidade; aprender/evoluir jutsu; configurar exibição; iniciar/finalizar missão; iniciar combate; enviar ação com número de turno e versão; obter eventos do combate; comprar/consumir/equipar; consultar extrato. Nenhum endpoint privado do original foi chamado para testar esses contratos.

O servidor deve validar posse, graduação, recurso e intervalo; registrar custos e recompensas na mesma transação; aceitar finalização idempotente; impedir turno duplicado ou simultâneo; controlar relógio, sorteio e efeitos no servidor. São requisitos de implementação recomendados, ainda sem prova sobre a tecnologia do original.

## Plano de validação reproduzível

| Teste | Sistema | Procedimento | Critério |
| --- | --- | --- | --- |
| T01 | Atributos derivados | Registrar base/bônus, alterar uma variável autorizada e comparar | Isolar base, multiplicador, bônus e arredondamento |
| T02 | Custo de jutsu | Registrar recurso antes/depois de uma ação | Confirmar custo exibido e modificadores |
| T03 | Intervalo | Usar técnica e registrar cada turno até liberar | Distinguir intervalo inclusivo/exclusivo |
| T04 | Dano | Mesma ação contra mesmo alvo sob condições comparáveis | Separar ataque, defesa, crítico, absorção e aleatoriedade |
| T05 | Precisão | Coletar amostra de ações com precisão conhecida | Estimar taxa e intervalo de confiança; não concluir com uma luta |
| T06 | Missão | Registrar aceitar, cumprir, finalizar e nova visita | Verificar crédito único e momento da concessão |
| T07 | Dojo | Contagem inicial/final; vitória/derrota; observar reset | Confirmar decremento, limite e fuso do período |
| T08 | Loja/inventário | Uma transação de baixo custo autorizada | Confirmar preço, saldo, quantidade e consumo |
| T09 | Aprendizado/evolução | Uma alteração autorizada com requisitos registrados | Confirmar preço/pontos/tempo e mudança de efeito |
| T10 | Equipe/organização | Acompanhar evento com participantes autorizados | Confirmar permissão, participação e divisão de recompensa |
| T11 | Round/VIP | Observar expiração e troca de ciclo | Confirmar persistência, resets e benefícios temporários |

Não executar testes de concorrência, carga ou exploração contra o serviço de terceiros. Robustez transacional e casos abusivos devem ser testados em ambiente próprio. Nesta investigação não houve compra, alteração de build ou distribuição de pontos. Houve uma luta NPC e consumo de uma unidade de ramen existente para recuperação. Não houve captura de código-fonte do servidor ou credenciais.

## Matriz de cobertura por tela

| ID | Tela | Origem | Cobertura |
| --- | --- | --- | --- |
| 1 | Missão concluída | https://narutogame.com.br/?secao=missoes_espera | Página observada; transações não testadas |
| 2 | Status após finalizar missão | https://narutogame.com.br/?secao=personagem_status | Página observada; transações não testadas |
| 3 | Histórico | https://narutogame.com.br/?secao=gasto_vip | Página observada; transações não testadas |
| 4 | Itens VIP | https://narutogame.com.br/?secao=jogador_vip | Página observada; transações não testadas |
| 5 | Seja VIP | https://narutogame.com.br/?secao=vantagens | Página observada; transações não testadas |
| 6 | Temas VIP | https://narutogame.com.br/?secao=temas | Página observada; transações não testadas |
| 7 | Criar Personagem | https://narutogame.com.br/?secao=personagem_criar | Página observada; transações não testadas |
| 8 | Fórmulas do Jogo | https://narutogame.com.br/?secao=atributos | Página observada; transações não testadas |
| 9 | Indique seus amigos | https://narutogame.com.br/?secao=indique | Página observada; transações não testadas |
| 10 | Mensageiro | https://narutogame.com.br/?secao=mensagens | Estado ou restrição observado; demais estados pendentes |
| 11 | Meus dados | https://narutogame.com.br/?secao=usuario_dados | Reservado; não coletado |
| 12 | Notícias | https://narutogame.com.br/?secao=noticias | Página observada; transações não testadas |
| 13 | Suporte | https://narutogame.com.br/?secao=suporte | Página observada; transações não testadas |
| 14 | Trocar Senha | https://narutogame.com.br/?secao=senha_trocar | Reservado; não coletado |
| 15 | Trocar Personagem | https://narutogame.com.br/?secao=personagem_selecionar | Página observada; transações não testadas |
| 16 | 8 Portões de Chakra | https://narutogame.com.br/?secao=portoes | Página observada; transações não testadas |
| 17 | Chakra das Bijuus | https://narutogame.com.br/?secao=chakras_bijuus | Página observada; transações não testadas |
| 18 | Clãs | https://narutogame.com.br/?secao=clas | Página observada; transações não testadas |
| 19 | Conquistas | https://narutogame.com.br/?secao=conquistas | Página observada; transações não testadas |
| 20 | Elementos | https://narutogame.com.br/?secao=personagem_elementos | Página observada; transações não testadas |
| 21 | Estudo Ninja | https://narutogame.com.br/?secao=estudo_ninja | Página observada; transações não testadas |
| 22 | Espadas da Névoa | https://narutogame.com.br/?secao=espadas | Página observada; transações não testadas |
| 23 | Fidelidade Ninja | https://narutogame.com.br/?secao=fidelidade | Página observada; transações não testadas |
| 24 | Histórico Ninja | https://narutogame.com.br/?secao=historico | Página observada; transações não testadas |
| 25 | Karma | https://narutogame.com.br/?secao=karma | Página observada; transações não testadas |
| 26 | Kekkei Genkai | https://narutogame.com.br/?secao=kekkei | Página observada; transações não testadas |
| 27 | Invocações | https://narutogame.com.br/?secao=invocacao | Página observada; transações não testadas |
| 28 | Mode Sennin | https://narutogame.com.br/?secao=mode_sennin | Página observada; transações não testadas |
| 29 | Modo História | https://narutogame.com.br/?secao=historia | Página observada; transações não testadas |
| 30 | Objetivos | https://narutogame.com.br/?secao=objetivos | Página observada; transações não testadas |
| 31 | Passe de Batalha | https://narutogame.com.br/?secao=passe_batalha | Página observada; transações não testadas |
| 32 | Profissão | https://narutogame.com.br/?secao=profissao | Página observada; transações não testadas |
| 33 | Recompensas | https://narutogame.com.br/?secao=recompensa_log | Página observada; transações não testadas |
| 34 | Status | https://narutogame.com.br/?secao=personagem_status | Página observada; transações não testadas |
| 35 | Selo Amaldiçoado | https://narutogame.com.br/?secao=selo | Página observada; transações não testadas |
| 36 | Sorte Ninja | https://narutogame.com.br/?secao=sorte_ninja | Página observada; transações não testadas |
| 37 | Talentos Ninja | https://narutogame.com.br/?secao=arvore_talento | Página observada; transações não testadas |
| 38 | Aprender Jutsus | https://narutogame.com.br/?secao=academia_jutsu | Quatro classes aprofundadas; aprendizado não executado |
| 39 | Graduações | https://narutogame.com.br/?secao=graduacoes | Página observada; transações não testadas |
| 40 | Jutsus Elementais | https://narutogame.com.br/?secao=academia_jutsu&tipo=1 | Captura inicial transitória; requer conferência de carregamento |
| 41 | Jutsus de Portão | https://narutogame.com.br/?secao=academia_jutsu&tipo=5 | Página observada; transações não testadas |
| 42 | Jutsus de Karma | https://narutogame.com.br/?secao=academia_jutsu&tipo=7 | Página observada; transações não testadas |
| 43 | Jutsus de Clã | https://narutogame.com.br/?secao=academia_jutsu&tipo=2 | Página observada; transações não testadas |
| 44 | Kinjutsus | https://narutogame.com.br/?secao=academia_jutsu&tipo=6 | Página observada; transações não testadas |
| 45 | Jutsus Medicinais | https://narutogame.com.br/?secao=academia_jutsu&tipo=3 | Página observada; transações não testadas |
| 46 | Treinamento de Atributos | https://narutogame.com.br/?secao=academia_treinamento | Página observada; transações não testadas |
| 47 | Treinamento de Jutsus | https://narutogame.com.br/?secao=personagem_jutsu | Catálogo e 41 jutsus detalhados; evolução não executada |
| 48 | Desafios | https://narutogame.com.br/?secao=desafios | Página observada; transações não testadas |
| 49 | Loja | https://narutogame.com.br/?secao=loja_sensei | Página observada; transações não testadas |
| 50 | Sensei | https://narutogame.com.br/?secao=sensei | Página observada; transações não testadas |
| 51 | Tutorial | https://narutogame.com.br/?secao=tutorial | Página observada; transações não testadas |
| 52 | Baú | https://narutogame.com.br/?secao=bau | Página observada; transações não testadas |
| 53 | Ninjas | https://narutogame.com.br/?secao=templos | Estado ou restrição observado; demais estados pendentes |
| 54 | Objetivos | https://narutogame.com.br/?secao=templo_objetivos | Página observada; transações não testadas |
| 55 | Temas | https://narutogame.com.br/?secao=temas_ninja | Página observada; transações não testadas |
| 56 | Caçada Ninja | https://narutogame.com.br/?secao=cacada | Página observada; transações não testadas |
| 57 | Equipamentos Ninja | https://narutogame.com.br/?secao=equipamentos_ninja | Página observada; transações não testadas |
| 58 | Eventos | https://narutogame.com.br/?secao=vila_eventos | Página observada; transações não testadas |
| 59 | Fórum | https://narutogame.com.br/?secao=vila_forum | Página observada; transações não testadas |
| 60 | Guerra de Vilas | https://narutogame.com.br/?secao=guerra_vila | Página observada; transações não testadas |
| 61 | Objetivos | https://narutogame.com.br/?secao=vila_objetivos | Página observada; transações não testadas |
| 62 | Missões | https://narutogame.com.br/?secao=missoes | Estado ou restrição observado; demais estados pendentes |
| 63 | Ninja Shop | https://narutogame.com.br/?secao=ninja_shop | Página observada; transações não testadas |
| 64 | Pacotes | https://narutogame.com.br/?secao=packs | Página observada; transações não testadas |
| 65 | Ramen Ichiraku | https://narutogame.com.br/?secao=ramen_shop | Página observada; transações não testadas |
| 66 | Reforja de Equipamentos | https://narutogame.com.br/?secao=reforja | Página observada; transações não testadas |
| 67 | Status da Vila | https://narutogame.com.br/?secao=vila | Página observada; transações não testadas |
| 68 | Votação dos Conselheiros | https://narutogame.com.br/?secao=votacao_vila | Página observada; transações não testadas |
| 69 | Arena | https://narutogame.com.br/?secao=arena | Página observada; transações não testadas |
| 70 | Dojo | https://narutogame.com.br/?secao=dojo | Estado ou restrição observado; demais estados pendentes |
| 71 | Dojo 4x4 | https://narutogame.com.br/?secao=dojo4x4 | Página observada; transações não testadas |
| 72 | Exame Ninja | https://narutogame.com.br/?secao=exame | Página observada; transações não testadas |
| 73 | Guerra Ninja | https://narutogame.com.br/?secao=guerra_ninja | Página observada; transações não testadas |
| 74 | Histórico de Batalhas | https://narutogame.com.br/?secao=log_batalha | Página observada; transações não testadas |
| 75 | Missões de Combate | https://narutogame.com.br/?secao=quest_combat | Página observada; transações não testadas |
| 76 | Torneios | https://narutogame.com.br/?secao=torneio | Página observada; transações não testadas |
| 77 | Batalhas 4x4 | https://narutogame.com.br/?secao=equipe_pvp | Página observada; transações não testadas |
| 78 | Desafios | https://narutogame.com.br/?secao=evento4 | Página observada; transações não testadas |
| 79 | Detalhes | https://narutogame.com.br/?secao=equipe_detalhe | Página observada; transações não testadas |
| 80 | Especialização | https://narutogame.com.br/?secao=equipe_especializacao | Página observada; transações não testadas |
| 81 | Eventos | https://narutogame.com.br/?secao=evento_listar | Página observada; transações não testadas |
| 82 | Missões | https://narutogame.com.br/?secao=missoes_equipe | Estado ou restrição observado; demais estados pendentes |
| 83 | Detalhes | https://narutogame.com.br/?secao=guild_detalhe | Página observada; transações não testadas |
| 84 | Missões | https://narutogame.com.br/?secao=guild_missoes | Página observada; transações não testadas |
| 85 | Missões de invasão | https://narutogame.com.br/?secao=missoes_invasao | Página observada; transações não testadas |
| 86 | 4x4 | https://narutogame.com.br/?secao=rank_4x4 | Página observada; transações não testadas |
| 87 | Bijuus | https://narutogame.com.br/?secao=rank_bijuus | Página observada; transações não testadas |
| 88 | Combates | https://narutogame.com.br/?secao=rank_batalhas_status | Página observada; transações não testadas |
| 89 | Conquistas | https://narutogame.com.br/?secao=rank_conquistas | Página observada; transações não testadas |
| 90 | Equipes | https://narutogame.com.br/?secao=rank_equipes | Página observada; transações não testadas |
| 91 | Espadas da Névoa | https://narutogame.com.br/?secao=rank_espadas | Página observada; transações não testadas |
| 92 | Estudo Ninja | https://narutogame.com.br/?secao=rank_estudo_ninja | Página observada; transações não testadas |
| 93 | Guerra Ninja | https://narutogame.com.br/?secao=rank_guerra | Página observada; transações não testadas |
| 94 | Ninjas | https://narutogame.com.br/?secao=rank_ninjas | Página observada; transações não testadas |
| 95 | Organizações | https://narutogame.com.br/?secao=rank_guilds | Página observada; transações não testadas |
| 96 | Sensei | https://narutogame.com.br/?secao=rank_sensei | Página observada; transações não testadas |
| 97 | Templo Ninja | https://narutogame.com.br/?secao=rank_templo_ninja | Página observada; transações não testadas |
| 98 | Vilas | https://narutogame.com.br/?secao=rank_vilas | Página observada; transações não testadas |
| 99 | Dojo — aba NPC | https://narutogame.com.br/?secao=dojo | Página observada; transações não testadas |

## O que impede encerrar como engenharia total

- Algumas páginas dependem de carregamento assíncrono; capturas contendo Carregando/Atualizando estão explicitamente sinalizadas na matriz.
- Catálogos dependem da classe, graduação, posse e desbloqueios do SubZero. Não há evidência de todas as variantes do jogo.
- Os 569 tooltips são ocorrências coletadas; repetições e efeitos contextualizados não equivalem a 569 regras únicas confirmadas.
- Motor de dano, probabilidades de drop/reforja, arredondamentos e processamento transacional não são dedutíveis integralmente pela interface.
- Conteúdo de outra conta/graduação e resultados de partidas precisam de observação autorizada. Nenhum acesso adicional foi presumido.

## Arquivos do pacote

- RELATORIO.md: síntese, especificação, matriz e plano de validação.
- matriz-telas.csv: cobertura por tela.
- jutsus-subzero.csv: valores extraídos dos 41 cartões.
- catalogos-e-evidencias.json: texto dos tooltips, cartões da academia, tabelas e abas, com contexto.
- naruto-game-telas.md: extração textual original para rastreabilidade.

Dados coletados em 09/11/2026; podem mudar conforme progressão ou atualização do jogo.

## Validação adicional de combate

Uma vitória NPC foi concluída após este levantamento inicial. O arquivo COMBATE.md apresenta resultados e hipóteses atualizadas; prevalece sobre os itens de validação antes marcados como inteiramente pendentes.
