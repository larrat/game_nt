# História, consumíveis e memória do agente

## Teste funcional concluído

Mizuki Touji foi derrotado no primeiro desafio do País das Ondas em 25 ações, alternando Dynamic Kick e Chute. O personagem começou com HP360/CP264/SP627 e terminou o painel de combate com HP306/CP165/SP249. As 25 transições conferem com os custos das técnicas: 99CP e378SP. O log completo e a extração dos estados estão nesta pasta.

A tela confirmou300XP,312Ryous e8 fragmentos. O Status após navegação mostrou XP1426/3240,3824Ryous e **duas vitórias NPC**, antes uma. Portanto, este desafio de história contou para o requisito NPC de graduação. Não foi confirmado se consumiu a cota diária do dojo.

Após navegar, os recursos persistidos estavam HP360/CP264/SP500. Eles diferem do painel final da luta; a regra de persistência/recuperação permanece desconhecida. O teste não mostrou recuperação adicional na passagem20→21. A hipótese de recuperação por turno20, levantada no outro combate, não pode ser usada como regra geral.

## História e ramen

Completar os cinco desafios do País das Ondas anuncia1250Ryous,1750XP,1954treino e1 ponto de aprimoramento. Essa recompensa de saga ainda não foi recebida; apenas Mizuki foi concluído.

A loja e a mochila mostraram cinco Merendas Ninja. O item anuncia200 de recuperação para cada recurso, custa17Ryous e exige Estudante nível1. As versões maiores dependem de graduação; versões Sensei têm requisitos adicionais de vitórias com o Sensei. O catálogo observado está em `ramen-detalhes.json`.

A mochila abre pelo ícone abaixo da barra de XP. Foi possível selecionar o item e ler seus efeitos, mas **não houve confirmação de consumo**: estoque continuou cinco e stamina500/627 no último estado lido. Não comprar nem consumir novamente com base nesse estado antigo sem conferir a conta. Aprimoramentos de jutsus e talentos continuam pendentes de validação na conta atual.

## Uso no agente jogador

`data/reference/player-agent-memory.json` contém estado confirmado, proveniência, decisões executadas, pendências e condições para agir. É um contrato de memória e evidências, ainda sem runtime de IA ou executor automático. Não contém autenticação, identificador da conta ou chat.

`node scripts/verify_mizuki_evidence.mjs` confere a sequência de25ações e os custos de recursos. A mesma verificação foi executada no runtime JavaScript disponível e passou. A CLI Node não está instalada no shell desta sessão.

O próximo estado precisa ser atualizado antes de qualquer ação. No último Status faltavam três vitórias NPC para Genin. Chuunin permanece a meta inicial; não foi alcançado. Não há combate deixado em andamento por este teste.

## Bloqueio da retomada

Na retomada seguinte, a primeira tentativa de conectar expirou na revisão automática de permissão; a nova tentativa permitida falhou na conexão da aba. Nenhuma ação no jogo foi executada nessa retomada. O trabalho local de validação e documentação prosseguiu.
