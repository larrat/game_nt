> **Acervo atualizado:** [coleta completa de 30/10/2026](coleta-2026-10-30/README.md), incluindo personagens, clãs, jutsus, mídias, progresso até nível 5 e duelo NPC. Abaixo permanece o dossiê inicial para contexto histórico.

# Dossiê de engenharia reversa — Naruto Game x Kurokage

> **Atualização de 30/10/2026:** este README descreve o escopo **inicial, anterior à sessão autenticada**. A PR #34 ampliou a observação para 76 rotas, com alguns testes controlados. Para a situação atual das telas, veja [observações autenticadas](authenticated-observations-2026-10-29.md) e o [mapa visual do Kurokage](../design/screen-catalog-and-visual-direction-2026-10-30.md). Alegações de risco deste dossiê inicial não substituem a auditoria das RPCs e permissões em produção.


## Objetivo
Transformar material público do Naruto Game e a implementação existente do Kurokage em uma especificação verificável para orientar evolução de gameplay, balanceamento e arquitetura. O foco é compreender sistemas e requisitos funcionais para um RPG independente, não copiar código, textos narrativos, arte ou identidade visual protegidos.

## Escopo e método
Foram cruzadas páginas públicas e materiais oficiais do Naruto Game, o Manual Básico Naruto Game R10, notícias oficiais do Round 53 iniciado em 25/09/2026 e inspeção estática dos arquivos do repositório Kurokage.

**Não foi feito login no Naruto Game, não foram executados testes dentro do jogo e não foi acessado o banco de produção do Kurokage.** Regras que só aparecem dentro da conta ou dependem de comportamento em tempo real estão pendentes de validação.

## Etiquetas de evidência
- **Confirmado no repositório:** aparece diretamente no código versionado; confirma a implementação atual do Kurokage, não necessariamente o comportamento em produção.
- **Fonte pública atual:** aparece em uma página/notícia oficial atual.
- **Fonte histórica:** aparece em manual ou notícia antiga; requer confirmação antes de tratar como regra atual.
- **Inferência/risco:** conclusão técnica dependente também das políticas RLS, grants e configuração efetiva.
- **A verificar:** exige cenário controlado no jogo ou configuração não disponível no repositório.

## Fontes públicas consultadas
1. [Naruto Game — Calculadora Ninja](https://www.narutogame.com.br/index.php/support?secao=calculadora). Lista atributos-base e opções de classe, nível, clã, invocação, selo, portão e Modo Sennin.
2. [Naruto Game — Manual](https://www.narutogame.com.br/?secao=manual). Página oficial com manual para download e tutoriais em vídeo.
3. [Manual Básico Naruto Game R10 (PDF)](https://www.narutogame.com.br/Manual_Basico_Naruto_Game_R10_v1.pdf). Referência histórica para requisitos/custos de jutsus, graduação, mapas e outros fluxos.
4. [Round 53 — O Início, 24/09/2026](https://www.narutogame.com.br/?id=649&secao=ler_noticia). Fonte pública recente para mudanças do Round 53.
5. [Sugestões e Mudanças — R53, 12/09/2026](https://www.narutogame.com.br/?id=646&secao=ler_noticia). Contexto de ajustes anunciados para o Round 53.

## Resumo executivo
A inspeção indica que o Kurokage já contém um RPG substancial: atributos e fórmulas, clãs, elementos, técnicas, aprimoramentos, equipamentos, treinamento, dojo/PvE, missões temporizadas, história, mapa, evento de chefe mundial, hospital, ferreiro, invocações, ranking e VIP.

O principal gargalo não é falta de sistemas. É **consistência e integridade**: regras de progressão e combate estão distribuídas entre JavaScript e SQL; várias mutações parecem ser enviadas diretamente pelo cliente; e algumas RPCs aceitam parâmetros de recompensa ou resultado fornecidos pelo cliente. O risco real depende também de RLS e permissões efetivas, que não foram verificadas em produção.

## Próximas etapas sugeridas
1. Confirmar as políticas RLS e os grants reais de cada tabela/RPC no Supabase.
2. Criar testes de caracterização para as fórmulas do motor antes de alterá-las.
3. Definir servidor/banco como fonte autoritativa para moeda, XP, itens, jutsus, conclusão de missão e resultado de batalha.
4. Comparar regras atuais do Naruto Game com evidências coletadas durante sessões autorizadas.
5. Corrigir primeiro falhas de autorização e recompensas; depois alinhar fórmulas e balanceamento.
