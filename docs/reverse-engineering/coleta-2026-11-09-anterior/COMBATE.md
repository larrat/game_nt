# Combate NPC observado — SubZero × Jinpachi Munashi

09/11/2026. Início fora de combate: vida 2197/2197, chakra 3601/3601, stamina 1198/1198. Após aceitar, máximos exibidos mudaram para 2297, 3691 e 1246; recursos de abertura: 2297, 3583 e 1138. A origem dessa diferença não foi isolada. Não atribuir automaticamente a perda a um jutsu específico.

## Resultado confirmado

Vitória em 11 ações. Recompensa: 900 ryous, 576 EXP e 8 fragmentos. Saldo após retorno: 76151 ryous e EXP 16051/28500, confirmando os incrementos de moeda e experiência em relação aos 75251/15475 anteriores. Oito fragmentos constam da mensagem de recompensa; não houve conferência independente de saldo de fragmentos.

| Turno | Técnica | Dano ao NPC | Observação |
| --- | --- | --- | --- |
| 1 | Izanami Lvl 2 | 209 | Custo observado: 161 chakra e 23 stamina |
| 2 | Kotoamatsukami Lvl 3 | 249 | Crítico |
| 3 | Katon Ryuuka Lvl 3 | 219 | Normal |
| 4 | Raiton Habateku Chidori Lvl 3 | 219 | Normal |
| 5 | Yasaka no Magatama Lvl 3 | 248 | Acertou nesta amostra |
| 6 | Izanami Lvl 2 | 209 | Reutilização no turno 6 |
| 7 | Kotoamatsukami Lvl 3 | 198 | Normal |
| 8 | Katon Ryuuka Lvl 3 | 226 | Perfurante |
| 9 | Raiton Habateku Chidori Lvl 3 | 219 | Normal |
| 10 | Sensei Kokohi Deboa Lvl 3 | 216 | Acertou nesta amostra |
| 11 | Sensei Hana Kyouka Sai Lvl 3 | Não capturado no log final | NPC passou de 36 para 0; vitória confirmada |

## Hipóteses sustentadas por esta amostra

O intervalo 5 permitiu reutilização de Izanami nos turnos 1 e 6, Koto nos 2 e 7, Ryuuka nos 3 e 8, Raiton nos 4 e 9. O contador residual visível nem sempre coincide com o bloqueio: a imagem voltou à opacidade 1 mesmo com texto residual 1. Para automação e reconstrução, distinguir apresentação e disponibilidade real.

Danos normais mostraram um acréscimo constante de 66 sobre o ataque do tooltip: 143→209, 153→219, 182→248, 132→198 e 150→216. Isso permite formular dano_normal = ataque_tooltip + 66 apenas neste confronto/build, não uma fórmula global. O termo 66 pode agregar ataque do personagem, efeitos e defesa; não foi decomposto.

Crítico de Koto: 249 contra normal 198. A diferença foi 51. Não assumir multiplicador universal a partir de um único evento. Perfuração de Ryuuka: 226 contra normal 219, diferença 7; pode estar associada à defesa do alvo, ainda não isolada.

O cabeçalho geral durante a luta permaneceu mostrando valores iniciais enquanto as barras dos participantes mudavam. Capturar os recursos do participante para custo por turno; não usar o cabeçalho como fonte única.

## Recuperação

Após retorno fora de combate: 2051/2197 vida, 3167/3601 chakra, 1198/1198 stamina. Não é uma simples cópia dos valores finais da batalha; regra de persistência/recuperação a confirmar. Foi consumida uma unidade existente de Sensei Shio Tyashu-Ramen, cujo tooltip declara recuperar 725 dos três recursos. Estoque caiu de 23 para 22; a interface confirmou 2197/2197, 3601/3601 e 1198/1198. Nenhuma compra efetuada.

## Cobertura restante

Uma vitória não valida derrotas, fuga, empate, timeout, todas as resistências, buffs/debuffs, PVP ou distribuição de probabilidades. As outras nove lutas diárias não foram executadas nesta etapa. O registro de snapshots está em combate-evidencias.json.
