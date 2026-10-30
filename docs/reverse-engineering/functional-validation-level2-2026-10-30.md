# Validação funcional — segunda sessão de 30/10/2026

## Escopo e método

Testes pela interface normal do Naruto Game, em personagem autorizado. Evidência anterior: authenticated-observations-2026-10-29.md. Esta sessão não representa cobertura total dos sistemas. Capturas brutas permanecem locais, sem publicação de identificadores ou chat.

## Resultados executados

| Caso | Ação e evidência | Resultado |
|---|---|---|
| Persistência da primeira lição | Selecionar personagem e abrir Status | Nível 1, XP 1782/3240, 1220 Ryous, Tarefas 1; treino anterior preservado |
| Remoção da tarefa concluída | Abrir Tarefas Iniciais | Primeira Lição ausente; lista começa na Segunda Lição. Ausência da ação normal de repetição confirmada; não é teste de proteção do servidor |
| Segunda Lição | Aceitar; aguardar 15 segundos; ler conclusão | +1782 XP e +220 Ryous; nível 2, XP 324/3240, saldo 1440 |
| Finalização e contador | Acionar Finalizar; abrir Status | Tarefas 2; XP e saldo persistidos |
| Recalcular recursos no nível 2 | Comparar conclusão com navegação seguinte e Status | Conclusão ainda exibia 138/238/103; navegação seguinte e Status exibiram 194/322/145, atuais iguais aos máximos |
| Atributos ao subir nível | Comparar Status antes/depois | Dez atributos-base inalterados, Energia 11; Determinação 1 → 2; demais derivados exibidos permaneceram iguais, exceto recursos |
| Dojo | Abrir rota observada dojo com personagem ativo | Redirecionamento para negado, byrule=section, source=dojo |
| Academia | Abrir rota observada academia_jutsu com personagem ativo | Redirecionamento para negado, byrule=section, source=academia_jutsu |
| Menu da Academia | Abrir menu lateral e acionar Academia e sua seta | Categoria destacada; sem opções filhas visíveis nas observações seguintes |

## Consequências para a implementação

A passagem de nível observada satisfaz 1782 + 1782 - 3240 = 324. Isso confirma saldo de XP após consumir o limiar nessa transição. O limiar exibido para nível 3 continuou 3240; outras transições exigem amostragem.

A recompensa efetiva de duas lições foi 220 Ryous frente a 200 anunciados. A causa do acréscimo permanece desconhecida. Não assumir VIP, evento ou bônus universal.

A atualização tardia dos recursos deve constar no fluxo: captura da conclusão pode conter valores anteriores ao recálculo. A observação não determina o momento exato da gravação no servidor. Deltas de máximos no nível 1 → 2: Vida +56, Chakra +84, Stamina +42, mantendo atributos-base. Não extrapolar fórmulas globais.

Acesso negado com XP e moeda no cabeçalho não demonstra sessão expirada nem requisito específico de graduação. A causa dos bloqueios de Dojo e Academia não foi resolvida. Não contornar as restrições.

## Matriz de continuidade

| Sistema | Cobertura acumulada | Próxima evidência necessária |
|---|---|---|
| Seleção e Status | Persistência validada | Equipamentos, modificadores e outras graduações |
| Treino | Uma distribuição real validada | Outra amostra de atributo, quantidade, limites e origem dos saldos |
| Tarefas | Duas conclusões e passagem de nível | Lições restantes, elegibilidade e progressão |
| Jutsus | Texto e catálogo parcial; acesso bloqueado nesta sessão | Acesso normal, aprendizado, custo e persistência |
| Combate | Navegação bloqueada nesta sessão | Modalidade acessível, turnos, recursos e recompensas |
| Graduação | Inspeção declarativa anterior | Requisitos efetivos e promoção quando elegível |
| Economia e inventário | Rotas capturadas anteriormente | Compra com moeda interna, equipar, efeitos e consumo |
| Vila e sistemas coletivos | Rotas capturadas anteriormente | Requisitos e fluxos acessíveis |
| VIP e temas | Filtros e estados inspecionados | Equipamento e desbloqueio; pagamentos reais ficam fora desta coleta |
| Rankings | Rotas visitadas | Filtros, paginação e atualização após atividade |

## Arquivos locais da sessão

sessao-status-inicial.txt; segunda-licao-resultado.txt e .jpg; nivel2-status.txt e .jpg; dojo-bloqueio.txt. Capturas de texto podem incluir estrutura da página além da área principal; não publicar sem revisão.
