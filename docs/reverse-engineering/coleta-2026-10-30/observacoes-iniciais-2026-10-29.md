> Registro histórico da primeira coleta autenticada. Os testes e catálogos posteriores estão consolidados em [validacao-funcional.md](validacao-funcional.md) e no [índice do acervo](README.md).

# Naruto Game × game_nt — inspeção autenticada de 29/10/2026

## Escopo e confiança

Complemento ao dossiê existente. Foram inspecionadas seleção de personagem, status, treinamento de atributos, graduações, academia de jutsus e temas VIP, em uma sessão já autenticada fornecida pelo usuário. A única entrada no jogo foi selecionar o personagem pelo botão Jogar; não foram realizados treinos, compras, promoções ou combates.

As observações são de interface, não acesso ao código do servidor. Regras escritas na tela são evidência declarativa; não foram testadas por transações. Esta etapa não é uma reconstrução completa do jogo. A amostra é um personagem de nível 1, Estudante, Vila da Folha. Identificadores da conta e conversas do chat foram omitidos.

O dossiê anterior permanece histórico: suas afirmações sobre não ter usado uma sessão autenticada descrevem a coleta anterior. Também não se deve tratar os riscos antigos como vulnerabilidades atuais sem revisar as migrações posteriores.

## Evidências e correspondência

| Tela / fonte | Observação atual | Correspondência no projeto |
|---|---|---|
| [Seleção](https://narutogame.com.br/index.php?secao=personagem_selecionar) | Nome, nível, graduação, moeda, vila, vida, chakra e stamina; ações Jogar e Remover | src/pages/Selecionar.jsx já contém esses campos e ações |
| Status após Jogar | Dez atributos-base, treze derivados, resultados por modalidade, missões por rank e treino acumulado | src/utils/engine.js, src/pages/Status.jsx |
| [Treinamento](https://narutogame.com.br/index.php?secao=academia_treinamento) | Pontos livres e treináveis distintos; progresso para próximo ponto; escolha de quantidade | src/pages/Treino.jsx usa pontos_atributos e gasto unitário com faixa estimada |
| [Graduações](https://narutogame.com.br/index.php?secao=graduacoes) | Aviso especifica vitórias + derrotas + empates de Mapa PVP | src/pages/Graduacoes.jsx soma PvP ponderado, NPC e dojo na condição de pontos |
| [Jutsus](https://narutogame.com.br/index.php?secao=academia_jutsu) | Requisitos dobrados fora da classe; medicinais e kinjutsus restritos a 4x4/4x1 segundo o texto | src/pages/Tecnicas.jsx não aplica multiplicador por classe em hasRequirements |
| [Temas VIP](https://narutogame.com.br/index.php?secao=temas) | Catálogo acessível após selecionar personagem; aquisição e liberação de personagem são estados independentes | Próxima inspeção de implementação: src/components/AvatarModal.jsx |

## Amostra reproduzível do motor

Entrada usada no cálculo do Kurokage, sem equipamentos, clã ou bônus adicionais:

```json
{"level":1,"rank":"Estudante da Academia","taijutsu":1,"bukijutsu":1,"ninjutsu":1,"genjutsu":5,"forca":1,"agilidade":3,"inteligencia":5,"selo":3,"resistencia":1,"energia":10}
```

Os atributos foram lidos do painel do Naruto Game. A ausência de outros modificadores no jogo de referência não foi comprovada; portanto esta é uma comparação de uma entrada equivalente simplificada, não prova das fórmulas internas.

| Medida | Naruto Game observado | engine.js executado |
|---|---:|---:|
| Vida | 136 | 350 |
| Chakra | 231 | 200 |
| Stamina | 96 | 180 |
| XP exibido para nível 2 / limiar calculado | 3240 | 1741 |
| Ataque Tai/Buk | 0 | 10 |
| Ataque Nin/Gen | 2 | 32 |
| Defesa Tai/Buk | 0 | 1 |
| Defesa Nin/Gen | 0 | 2 |
| Perfuração | 3 | 6 |
| Precisão | 3 | 6 |
| Concentração | 0 | 5 |
| Percepção | 0 | 2 |
| Convicção | 0 | 5 |
| Determinação | 1 | 5 |

Verificação: funções do arquivo remoto src/utils/engine.js foram executadas em JavaScript, removendo apenas os qualificadores de exportação para carregamento no ambiente de análise. Não foi executada a suíte completa do aplicativo nem consultado seu banco.

A interface do Naruto Game mostra XP 0/3240. Como a amostra tem XP zero, ela não resolve a distinção entre XP total e XP por nível em níveis posteriores. O Kurokage define calculateXPForLevel como limiar de XP total.

Não ajustar constantes para encaixar apenas essa amostra. Para inferir coeficientes, coletar observações independentes por atributo, nível, graduação e modificador, incluindo pontos de arredondamento.

## Treinamento: diferenças de modelo

A tela observada mostra 12 pontos livres, dos quais 5 treináveis, e progresso 0/1950 para o próximo ponto. As opções de quantidade vão de 1 a 5 nesta amostra; isso não prova um teto global de cinco.

O texto da interface declara:
- energia treinada acrescenta 2 de vida por ponto;
- cada batalha PVP rende 200 de treino;
- o orçamento diário é 3000, acumulado pelos dias de round.

O acumulador PVP aparece como 0/102000. A relação exata entre esse acumulador, os pontos livres e os treináveis permanece pendente. Também não foi validado quais modalidades e resultados de batalha são elegíveis.

No Kurokage, calculateHP usa energia × 20. Treino.jsx apresenta ganho mínimo/máximo por atributo e graduação, e consome um ponto por ação. Trata-se de uma diferença de modelo; mudar somente o coeficiente de vida não reproduziria a progressão.

## Jutsus e graduação

Na academia aparecem quatro famílias básicas e, no menu, rotas para elementais, clã, portão, karma, medicinais e kinjutsus. O botão de aprendizado em massa aponta para a página VIP. Não foram acionados os botões Treinar.

Tecnicas.jsx verifica nível, graduação, atributos e moeda. A escolha inicial da aba deriva do maior atributo; isso não demonstra a existência de uma classe persistente. Antes de implementar o dobro de requisitos, definir qual campo representa classe, quais requisitos são multiplicados e se a regra é avaliada igualmente no aprendizado individual e em massa.

Graduacoes.jsx calcula pontos como:
```text
(vitórias_pvp + derrotas_pvp) × 1,5 + vitórias_npc + vitórias_dojo
```
Isso difere do aviso atual do Naruto Game sobre Mapa PVP e empates. Os requisitos numéricos dos cartões não foram expandidos, e nenhuma promoção foi solicitada. O catálogo efetivo do game_nt não foi lido do banco; a comparação aqui é do código de apresentação.

## Temas: especificação funcional inicial

A página apresenta filtros por personagem, liberação da versão, aquisição do tema e tipo (simples ou animado). Cada item distingue personagem, versão, tema adquirido e personagem liberado. Há combinações de tema adquirido com personagem ainda não liberado.

Modelo proposto para uma implementação independente:
- catálogo de personagens e versões;
- catálogo de temas vinculado à versão, com tipo e recurso visual próprio;
- aquisição por conta/personagem, conforme decisão de produto;
- desbloqueio de versão separado da aquisição;
- tema equipado separado do inventário de temas.

Critérios de aceitação: filtros combináveis; estado vazio; imagem alternativa; indicação de ambos os bloqueios; persistência da seleção autorizada. A política exata de equipar, preço e escopo da aquisição ainda precisa ser observada. Não presumir que aquisição basta para equipar. Nenhuma arte foi baixada ou incorporada ao projeto.

## Ordem de implementação e validação

1. Registrar amostras e decisões de paridade em documentos versionados. Separar regras próprias do Kurokage das regras que se pretende reproduzir.
2. Treinamento: especificar pontos livres, treináveis, orçamento de round e conversão; testar limites e consumo antes de alterar progressão existente.
3. Jutsus: definir classe e multiplicador de requisitos; verificar consistência entre aprendizado individual, em massa e validação autoritativa.
4. Graduação: decidir se a regra será Mapa PVP ou o modelo híbrido atual; manter contadores por modalidade e resultados.
5. Temas: inspecionar AvatarModal e o catálogo atual; implementar aquisição, desbloqueio e equipamento como estados distintos.
6. Ampliar coleta para missões, dojo, combate, mapa, economia e requisitos avançados. Fórmulas de dano, cooldowns e recompensas ainda não foram verificadas nesta sessão.

Para futuros testes controlados, registrar estado antes/depois, ação, custo, recompensa, horário e contexto de round. Usar personagem de teste quando a coleta exigir gastar pontos ou alterar progressão. Não transformar valores de uma conta em padrões globais.

## Limites da entrega

Este documento entrega evidências novas e um mapa de diferenças acionável. Não altera gameplay, migrações ou dados de produção. Não afirma equivalência completa, não recupera o backend do Naruto Game e não valida segurança do banco do Kurokage.
