# Próximo ajuste do treinamento

Status: proposta de implementação; regras de conversão ainda pendentes de coleta.
Fonte: [observações autenticadas](authenticated-observations-2026-10-29.md), teste de 29–30/10/2026.

## Problema e resultado pretendido

A referência apresenta pontos livres e pontos treináveis separados. O fluxo inspecionado do game_nt usa pontos_atributos e uma faixa estimada de ganho por ação. Para aproximar os comportamentos, o próximo incremento deve explicitar disponibilidade e consumo e mostrar o resultado persistido da operação.

A primeira entrega proposta é definir o contrato de treinamento e validar seus limites. Alterar fórmulas de combate requer amostras adicionais.

## Evidências

| Medida | Antes | Após treinar 1 Energia |
|---|---:|---:|
| Pontos livres | 12 | 11 |
| Pontos treináveis | 5 | 4 |
| Energia | 10 | 11 |
| Vida máxima | 136 | 138 |
| Chakra máximo | 231 | 238 |
| Stamina máxima | 96 | 103 |
| Pontos distribuídos | 0 | 1 |

Os valores persistiram após nova seleção do personagem. Uma amostra não determina a fórmula global. A interface também declara 200 de treino por PvP e orçamento diário de 3000 acumulado no round; essas regras não foram executadas.

## Contrato proposto

A operação recebe personagem, atributo permitido, quantidade inteira positiva e identificador único da solicitação. O servidor calcula elegibilidade, custo e resultado a partir do estado atual; o cliente exibe esses dados.

A resposta informa valores anteriores e posteriores, quantidade aplicada, saldo livre, saldo treinável e atributos derivados recalculados. A operação é atômica: falha de validação ou persistência mantém todo o estado anterior. Reenvio do mesmo identificador devolve o resultado original sem novo consumo.

Saldo livre representa pontos ainda não distribuídos. Saldo treinável representa a quantidade atualmente autorizada para distribuição. Esta distinção é uma proposta semântica baseada na interface; a origem e a reposição do segundo saldo exigem confirmação. Não duplicar campos no banco antes de verificar o modelo vigente.

Quantidade máxima proposta: menor valor entre saldo livre e saldo treinável, acrescido de qualquer limite por operação que venha a ser confirmado. O máximo observado de cinco opções não estabelece teto universal.

## Critérios de aceitação

1. Exibir os dois saldos com descrições distintas e quantidade selecionável.
2. Ao enviar, desabilitar o controle até a resposta e exibir o resultado confirmado pelo servidor.
3. Recusar zero, negativos, frações, atributo desconhecido e quantidade acima da disponibilidade, sem alteração parcial.
4. Em duas solicitações concorrentes, o consumo total não ultrapassa o saldo disponível.
5. Repetir uma solicitação com o mesmo identificador não duplica consumo ou ganho.
6. Reabrir a tela e selecionar novamente o personagem preserva o resultado.
7. Em caso de erro, atualizar o estado autoritativo e informar o usuário pelo mecanismo de toast existente.
8. Registrar a regra e sua versão para reproduzir cálculos e investigar diferenças.

Os ganhos +2/+7/+7 são evidência de referência, não resultados exigidos do motor atual. A adoção desses coeficientes depende de decidir paridade e validar outras amostras.

## Sequência de implementação

1. Reler Treino.jsx, engine.js e a operação autoritativa atual, incluindo migrações posteriores à inspeção inicial.
2. Mapear os campos existentes para o contrato e identificar se os dois saldos já podem ser derivados.
3. Confirmar como pontos são obtidos, convertidos e limitados antes de criar migração.
4. Implementar validação, atomicidade e proteção contra reenvio no servidor.
5. Conectar a interface à resposta e recalcular derivados pelo mesmo conjunto de regras.
6. Validar em ambiente de teste: consumo normal, saldo insuficiente, concorrência, reenvio e persistência.

## Coleta necessária para paridade

- Treinar outro ponto de Energia com modificadores conhecidos e comparar deltas.
- Observar um atributo diferente mantendo nível e equipamentos constantes.
- Comparar quantidade 1 e quantidade maior, quando disponível.
- Observar mudança de nível e graduação sem misturar outras alterações.
- Medir treino obtido por modalidade e resultado de PvP.
- Confirmar orçamento do round, reposição diária, conversão e arredondamento.
- Verificar como a mudança de máximos afeta Vida, Chakra e Stamina atuais quando parcialmente gastos.

## Limites

Este documento não muda o jogo nem confirma vulnerabilidades. Segurança, campos e regras atuais precisam ser verificados no código vigente antes da implementação. A conclusão de tarefas e seus bônus pertencem a uma investigação separada; o ganho de 220 Ryous não fundamenta regras de treinamento.
