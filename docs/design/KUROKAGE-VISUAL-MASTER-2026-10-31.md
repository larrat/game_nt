# Kurokage — plano mestre visual e integração de artes (31/10/2026)

## Direção de produto
- **Referência funcional:** Naruto Game — observar organização da navegação, densidade informacional, estado do personagem e relação entre retratos e combates.
- **Identidade:** Kurokage / Quartel Ninja; experiência tática com heróis narrativos pontuais. Evitar uma cópia literal do shell, CSS ou branding.
- **Arte temporária:** priorizar materiais já versionados e rotulados como referência. O jogo está hospedado publicamente; projeto pessoal não significa automaticamente autorização de reprodução/distribuição. Antes de publicar novas cópias, revisar origem e permissão (issue #70).
- **Custo:** sem criar branch de banco paga, dependências pagas ou armazenamento externo. Imagens devem ser dimensionadas e otimizadas antes de incluir no bundle público.

## Execução incremental
| Ordem | Objetivo | Critério de aceite |
| --- | --- | --- |
| P0 | Inventário visual (rotas, ícones, imagens, autoria, tamanho) | 25 itens de menu mapeados e cada mídia classificada como local, referência ou ausente |
| P1 | Personagens, NPCs e World Boss | O mesmo personagem usa a mesma arte em mapa, combate e evento; fallback não apresenta imagem de outro personagem |
| P2 | Design tokens / UI kit de navegação | Sidebar/topbar, ícones Lucide/SVG consistentes, variantes de foco, active e mobile |
| P3 | Dashboard e Status | Hierarquia: personagem > recursos > ações > progressão; dados verdadeiros |
| P4 | Academia, técnicas e missões | Ações, custos, requisitos, tempo, risco e recompensa legíveis |
| P5 | Combate / evento / vila | Retratos responsivos, turno, barras com valores e log legível; testes com contas descartáveis |
| P6 | Arte original Kurokage | Substituição por manifest de arquivos, sem renomear IDs ou mexer nas regras de negócio |

## Registro atual (baseado no repositório)
- `public/images/`: retratos nomeados disponíveis de Naruto, Sasuke, Sakura e Kakashi; `src/utils/npcArtwork.js` registra a correspondência.
- `docs/reverse-engineering/coleta-2026-10-30/personagens-catalogo/`: 711 mídias locais de referência (de 6.128 URLs únicas). Elas **não** ficam automaticamente disponíveis ao Vite.
- O repositório contém o arquivo `imagens-clas/kurama.png`, mas ele identifica o **clã Kurama**, não serve como prova de imagem da criatura World Boss.
- **Arte da criatura Kurama não verificada em public/images:** manter fallback acessível até haver uma arte identificada e com direitos avaliados; não reutilizar floresta ou uma pessoa como chefe.
- `data/reference/initial-characters.json` documenta 188 personagens e 222 avatares após seed; os números não equivalem a retratos locais prontos ou NPCs ativos.

## Contrato do novo registro
- `resolveNpcArtwork(npc)`: caminho `/images/*` válido do NPC ou retrato curado para nome conhecido; nunca altera o NPC enviado ao servidor.
- `resolveWorldBossArtwork(event)`: caminho `/images/*` explícito; nunca retorna `bg_forest.jpg` como criatura.
- `CharacterArtwork`: em erro de carregamento, exibe fallback acessível; não faz hotlink para URLs arbitrárias.
- Quando obtivermos a arte correta da Kurama, publique uma versão otimizada em `public/images/bosses/kurama.webp` e registre a associação, validando o arquivo no preview antes de publicar.

## QA mínimo antes de merge
1. Naruto, Sasuke, Sakura e Kakashi exibem retrato correto em batalha; NPC sem retrato continua visível.
2. World Boss com imagem explícita mostra essa imagem no card e no combate; sem imagem não usa fundo de floresta como personagem.
3. Mapa mostra miniaturas sem deformação; navegação e início de batalha mantêm as regras originais.
4. Conferir telas em 320, 390, 768 e 1440px, teclado, contraste e `prefers-reduced-motion`.
5. `npm test`, `npm run build` e prévia Vercel; depois homologação autenticada sem alterar permissões ou migrar DB.
