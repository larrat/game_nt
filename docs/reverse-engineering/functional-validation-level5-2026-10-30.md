# Progressão validada até o nível 5 — 30/10/2026

Complementa [validação até o nível 2](functional-validation-level2-2026-10-30.md) e [inventário estrutural](client-structure-screen-inventory.md). Testes realizados pela interface normal no personagem autorizado. Não houve combate, compra ou distribuição adicional de atributos nesta etapa.

## Sequência executada

Estado inicial: nível 2, XP 324/3240, 1440 Ryous, duas tarefas concluídas. A missão anterior ainda apresentava Finalizar. Após acionar e aguardar a navegação, a lista de tarefas voltou a abrir.

Foram aceitas e concluídas, na ordem, as lições 3 a 9, cada uma anunciando 15 segundos e recompensa base de 200 Ryous. O painel de conclusão foi observado e a finalização acionada em cada etapa.

| Lição | XP recebido | Ryous recebidos | Nível após recompensa | XP exibido | Saldo |
|---|---:|---:|---:|---:|---:|
| Terceira | 1782 | 220 | 2 | 2106/3240 | 1660 |
| Quarta | 1782 | 220 | 3 | 648/3240 | 1880 |
| Quinta | 1782 | 220 | 3 | 2430/3240 | 2100 |
| Sexta | 1782 | 220 | 4 | 972/3240 | 2320 |
| Sétima | 770 | 220 | 4 | 1742/3240 | 2540 |
| Oitava | 770 | 220 | 4 | 2512/3240 | 2760 |
| Nona | 770 | 220 | 5 | 42/3240 | 2980 |

Totais desta etapa: 9438 XP e 1540 Ryous. Verificação aritmética: 324 + 9438 - 3 × 3240 = 42. O personagem terminou com nove tarefas concluídas; a Décima Lição não foi executada.

A recompensa em XP muda entre a sexta e a sétima lição. Não atribuir a mudança ao nível sem isolar outras variáveis. O acréscimo monetário observado sobre a recompensa base continua sem causa comprovada.

## Recursos e atributos

Valores observados depois da finalização/navegação:

| Nível | Vida máxima | Chakra máximo | Stamina máxima | XP exibido após a lição que gerou o nível |
|---|---:|---:|---:|---:|
| 2 | 194 | 322 | 145 | 324/3240 |
| 3 | 250 | 406 | 187 | 648/3240 |
| 4 | 306 | 490 | 229 | 972/3240 |
| 5 | 362 | 574 | 271 | 42/3240 |

Nesta sequência os deltas entre níveis foram +56 Vida, +84 Chakra e +42 Stamina. Os recursos atuais estavam iguais aos máximos; não foi testado subir de nível com recursos parcialmente gastos.

Status final preservou Taijutsu 1, Bukijutsu 1, Ninjutsu 1, Genjutsu 5, Força 1, Agilidade 3, Inteligência 5, Selo 3, Resistência 1 e Energia 11. Determinação passou de 2 no nível 2 para 5 no nível 5. Outros derivados exibidos no Status final: ataques 0/2, defesas 0/0, Perfuração 3, Precisão 3, Concentração 0, Percepção 0 e Convicção 0. Pontos distribuídos permaneceram em 1; total de treino 11700.

O limiar de XP exibido permaneceu 3240 nas transições observadas até nível 5. Essas amostras não estabelecem a curva completa nem as fórmulas globais de recursos.

## Finalização pendente e revisão dos bloqueios

A rota Tarefas retornava Acesso negado enquanto a tela de missão ainda mostrava a conclusão anterior e o botão Finalizar. Após finalizar e aguardar, o site navegou para Tarefas e permitiu continuar.

Correção de interpretação para os documentos anteriores: as 36 rotas bloqueadas no inventário são bloqueios no estado observado; não representam 36 requisitos permanentes de nível/graduação. Uma missão pendente de finalização pode ter influenciado esse resultado. Dojo, Academia e as demais rotas não foram todas retestadas após liberar a missão, portanto a causa de cada bloqueio permanece pendente.

A captura imediatamente após um clique pode ainda mostrar o estado anterior. Aguardar o resultado da navegação antes de abrir outra rota; não tratar uma resposta intermediária como falha definitiva da ação. Não foi testada a implementação interna do bloqueio.

## Evidências e continuidade

Status final verificado em personagem_status: nível 5, 42/3240 XP, 2980 Ryous, recursos 362/574/271 e Tarefas 9. Evidências locais: outputs/naruto-capturas/nivel5-status.txt e nivel5-status.jpg. O GitHub recebe somente esta síntese, sem capturas brutas, conversas ou identificadores da conta.

Próximos testes: retestar as rotas antes bloqueadas com missão finalizada; conferir requisitos de graduação e completar a Décima Lição quando pertinente; validar aprendizado e combate disponíveis. As evidências atuais sustentam testes de regressão da progressão inicial, sem justificar alterações automáticas nas fórmulas próprias do game_nt.
