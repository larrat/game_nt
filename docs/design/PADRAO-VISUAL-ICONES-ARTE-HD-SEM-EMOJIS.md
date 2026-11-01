# Kurokage — padrão obrigatório de ícones, retratos e artes HD

**Data da decisão:** 31/10/2026  
**Origem:** orientação expressa do responsável pelo projeto GAME_NT/Kurokage  
**Estado:** decisão de produto registrada; implementação visual e homologação ainda pendentes

## Regra visual

Não usar **emojis Unicode genéricos** como representação definitiva de clãs, atributos, jutsus, personagens, NPCs, classes, itens, recursos, vila, mapa ou combates. Exemplos a substituir: `📜`, `🥷`, `👊`, `🩸`, `🔥` quando representarem arte ou ícone do jogo.

A linguagem visual desejada usa como **referência os ícones e imagens identificados no Naruto Game**, com versões de alta resolução (HD), ajustes de nitidez, recorte, iluminação, proporção e coerência com o design system do Kurokage. Manter a identidade do personagem e do clã; não inventar NPCs, clãs ou artes incoerentes apenas para preencher a tela.

Ao faltar imagem, mostrar placeholder neutro projetado no UI Kit, com texto descritivo; **não retornar a emojis como fallback**. Ícones de navegação temporários podem ser vetores consistentes (como Lucide), mas os ícones ilustrados finais devem ter linguagem visual ninja aprovada.

## Autorização de uso — comunicação do responsável em 31/10/2026

O responsável pelo Kurokage **informou expressamente nesta data que conversou com o proprietário do Naruto Game e recebeu autorização de uso das imagens** para o projeto. Registrar essa autorização comunicada como fato relatado pelo responsável; **não afirmar que a equipe verificou um documento, contrato ou mensagem do titular**, pois a evidência não foi anexada ao repositório nesta etapa.

**Escopo informado:** autorização para utilizar imagens do Naruto Game no Kurokage, conforme declaração do responsável.  
**Escopo ainda não especificado/documentado:** modalidades de publicação (web pública), redistribuição, adaptações/upscale HD, prazo, restrições de atribuição, eventuais limites comerciais, revogação e se o titular dispõe dos direitos sobre todas as artes de terceiros envolvidas. Não presumir sublicença ou titularidade sobre personagens e artes de outras fontes.

**Próximo registro de proveniência:** guardar, em local de acesso restrito, o e-mail, mensagem ou termo que identifique o titular, os arquivos abrangidos e as condições autorizadas; registrar no manifesto apenas a referência não sensível à evidência. Uma autorização oral relatada já informa a direção do produto, mas, até delimitar o escopo e o acervo efetivamente coberto, não tratar cada arquivo como automaticamente liberado para distribuição pública.

## Acervo já coletado (não equivale a integração)

- **40 imagens de clãs** e cinco imagens adicionais: `docs/reverse-engineering/coleta-2026-10-30/imagens-clas/manifest.json`.
- **320 referências de técnicas de clã**, com imagens locais: `docs/reverse-engineering/coleta-2026-10-30/jutsus-catalogo/`.
- **Personagens, variantes e ícones do cabeçalho:** `docs/reverse-engineering/coleta-2026-10-30/personagens-catalogo/` e `naruto-processos/icones-cabecalho.json`.

Os arquivos acima estão no acervo de pesquisa; não são automaticamente carregados pelas telas ou incluídos na pasta `public/`. A tela `src/pages/Clas.jsx` ainda contém `ATTR_ICONS` com emojis; `src/components/JutsuCard.jsx` ainda usa `📜` como fallback. O dado de imagem de clã é obtido de `clans.image_url`, o que não demonstra ligação com o manifesto pesquisado.

## Implementação e critérios de aceite

1. Criar um **manifesto de arte centralizado**: chave do clã/técnica/personagem/atributo, nome de exibição, versão, origem, referência da autorização, caminho local final e fallback.
2. Priorizar: **Clãs → Técnicas de clã → Atributos (Status/Treino/Clã) → NPCs e personagens → Mapa da vila/combate → demais 31 telas**.
3. Preparar imagens otimizadas, proporcionais e nítidas em múltiplas densidades (mínimo 1× e 2× quando fizer sentido); preferir WebP/AVIF e SVG para ícones vetoriais próprios, sem esticar imagens pequenas nem criar arquivos de vários megabytes por ícone.
4. Usar nomes e variantes canônicos; NPC do mapa deve ter retrato coerente, e **a posição do jogador na vila deve usar a imagem/ícone do próprio personagem**, sobre o cenário correto de mapa da vila.
5. Padronizar dimensões, bordas e estados carregando/erro; acessibilidade com `alt` contextual, foco e responsividade em 320/390/768/1440px.
6. Não modificar dano, XP, Chakra, **Stamina**, custo, recompensas ou regras de clã ao integrar imagens. O novo modelo de Stamina separado por habilidades Taijutsu/Bukijutsu requer decisão e implementação funcional própria, com validação das RPCs do servidor.
7. Concluir a integração com testes de caminhos/manifestos, build, revisão visual autenticada e conferência da cadeia de autorização dos materiais publicados.

**Nota de estado:** esta documentação registra o requisito e o relato de autorização; **não afirma** que os ícones, retratos ou imagens HD já foram integrados ou publicados no jogo.
