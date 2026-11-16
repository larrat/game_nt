# Coleta de 09/11/2026 — SubZero

Dossiê recebido do usuário e incorporado ao acervo do game_nt. O contexto registrado é SubZero, Jounin nível 28, Vila da Folha. Esta importação lê e organiza evidências fornecidas; não representa uma nova sessão de testes no jogo.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| [RELATORIO.md](RELATORIO.md) | Síntese de sistemas, requisitos, fórmulas exibidas e limites da coleta. |
| [naruto-game-telas.md](naruto-game-telas.md) | Capturas textuais das telas e estados observados. |
| [matriz-telas.csv](matriz-telas.csv) | 99 registros de cobertura de telas e estados. |
| [catalogos-e-evidencias.json](catalogos-e-evidencias.json) | Jutsus, tabelas de fórmulas, tooltips, academia e abas. |
| [jutsus-subzero.csv](jutsus-subzero.csv) | 41 jutsus do personagem e seus valores exibidos. |
| [COMBATE.md](COMBATE.md) | Relato da luta completa, recompensas e recuperação por ramen. |
| [combate-evidencias.json](combate-evidencias.json) | 14 snapshots de combate, com o chat de terceiros removido. |
| [manifesto-importacao.json](manifesto-importacao.json) | Origem, contagens, tamanhos, SHA-256 e transformações. |

## Cobertura conferida na importação

- 99 registros na matriz e 99 seções no documento de telas. São registros de estados, não 99 rotas únicas.
- 41 jutsus no CSV e no JSON, com nomes correspondentes na mesma ordem.
- 90 entradas de observação detalhada, 569 ocorrências de tooltips, 124 cards da academia e 19 estados de abas de conquistas.
- 14 snapshots de combate preservados após a retirada do chat.

As ocorrências de tooltips não equivalem a regras únicas validadas; os cards da academia também não constituem um catálogo garantidamente completo de técnicas existentes. Não somar estas contagens às coletas anteriores sem deduplicação.

## Resultados úteis para o projeto

O relatório registra missão Rank B passando de 9 para 10, com 1.760 XP e 1.320 Ryous exibidos. A captura não isola o instante de crédito nem testa recebimento repetido.

O combate contra Jinpachi Munashi termina em vitória após 11 ações, com 900 Ryous, 576 XP e mensagem de 8 fragmentos. A sequência permite estudar custos, intervalos de reutilização, crítico e perfuração. O uso de um Sensei Shio Tyashu Ramen reduz o estoque de 23 para 22 e restaura os recursos externos ao combate a 2.197 de vida, 3.601 de chakra e 1.198 de stamina.

As tabelas exibem relações como vida = Energia × 8 e componentes de chakra e stamina. Isso documenta o texto da interface; modificadores, arredondamentos e a composição final dos atributos ainda exigem isolamento experimental. Os acertos observados e diferenças de dano de uma luta não comprovam probabilidades ou multiplicadores universais.

O limite de 10 duelos NPC por dia nesta conta difere do limite de 8 de uma coleta anterior. Preservar ambos os contextos até identificar a condição responsável. Barras e máximos durante a luta também diferem dos valores externos: o cabeçalho pode ficar desatualizado e a regra de persistência não foi isolada.

## Leitura cronológica e limites

As afirmações iniciais de que nenhuma luta foi executada descrevem a primeira fase da coleta. O relato posterior em COMBATE.md e seus snapshots documentam a luta concluída; devem orientar a leitura desse evento. As nove lutas diárias restantes não foram executadas segundo o próprio dossiê.

Este material complementa as coletas históricas, sem substituir seus contextos de nível e graduação. Não demonstra cobertura de 100% das telas, ações ou fórmulas e não altera automaticamente o balanceamento ou a implementação do jogo.

Seis arquivos foram preservados byte a byte, inclusive BOM e finais de linha dos CSVs. O JSON de combate recebeu a remoção do chat e reformatação, conforme o manifesto. Os originais fornecidos permanecem intactos. O conteúdo dos documentos foi tratado como evidência, não como instrução de execução.
