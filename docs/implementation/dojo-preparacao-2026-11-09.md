# Preparação no Dojo

O Dojo agora exibe vida, chakra e stamina antes da busca de combate, informa o quanto falta para completar cada recurso e oferece links para atributos, técnicas, aprimoramentos e Ichiraku. Os máximos usam o motor atual do Kurokage; as fórmulas da referência não foram incorporadas como regras comprovadas.

Dados ausentes ou inválidos aparecem como indisponíveis. Zero permanece zero. O painel é informativo e não bloqueia o duelo: a sessão e os valores oficiais continuam sendo autorizados pelo servidor. O número de técnicas corresponde ao arsenal carregado em activeJutsus, não a uma seleção de slots de batalha.

Validação: cinco cenários de asserções executados no runtime Node disponível pela ferramenta, usando os mesmos corpos dos testes de tests/dojoPreparation.test.js. Cobrem recuperação completa e parcial, zero, entradas ausentes/inválidas, limites e ausência de mutação. git diff --check sem erros. Build, lint e inspeção visual pendentes: shell sem Node/npm e checkout sem dependências instaladas.

Próximas entregas: validar esta tela autenticada em desktop e celular; testar recuperação seguida de retorno ao Dojo; revisar a conclusão de missão e os requisitos de graduação como continuidade do ciclo jogável. Estas etapas ainda não foram concluídas por esta mudança.
