# Kurokage — plano mestre visual e integração de artes (31/10/2026)

## Direção de produto
- **Referência funcional:** Naruto Game para arquitetura de informação, densidade dos dados e hierarquia de progressão — sem copiar branding, estilos ou mídias protegidas.
- **Identidade:** Kurokage / Quartel Ninja. Priorizar arte original ou licenciada e componentes reutilizáveis.
- **Custo:** sem serviços pagos extras; otimizar cada imagem antes de incluí-la em `public/images`.

## Etapas e critérios de aceite
| Ordem | Objetivo | Critério |
| --- | --- | --- |
| P0 | Inventário de rotas e arte | Origens da mídia documentadas e telas com componentes catalogados |
| P1 | NPCs e World Boss | Retratos locais consistentes no mapa, radar, evento e combate, com fallback acessível |
| P2 | Design system | Sidebar/topbar, ícones consistentes, foco, estado ativo e suporte mobile |
| P3 | Arquivo de Adversários | NPCs, catálogo e projeções de jogadores consultados sem expor dados privados |
| P4 | Dashboard / Status | Personagem, recursos, progressão e ações reais legíveis |
| P5 | Academia / Técnicas / Missões | Custos, requisitos, tempo e recompensas documentados e legíveis |
| P6 | Combate e sessões | Qualquer nova seleção de adversário exige validação autoritativa para iniciar/finalizar combate |
| P7 | Artes originais | Substituir retratos com autoria/licenças verificadas, sem alterar IDs do banco |

## Estado do código e limitações
- Retratos locais existentes de Naruto, Sasuke, Sakura, Kakashi, variantes curadas de Sasuke e uma raposa original aparecem por meio de `src/utils/npcPortrait.js` e `src/components/NpcPortrait.jsx`. Ausências usam fallback, sem baixar imagem externa. Estes componentes substituem a implementação experimental da PR #75.
- O Arquivo de Adversários (`/adversarios`, PR #81) unifica consulta visual a `characters`, `npcs` e o RPC público `listar_perfis_ninja`; **não concede autorização nova de combate**.
- `scripts/audit-artwork.mjs` inspeciona as referências locais de `data/reference/initial-characters.json`. É somente leitura, não copia arte, não executa SQL e não requer serviço externo.
- `docs/reverse-engineering` guarda materiais de referência; a presença de arquivos não concede direito de publicá-los.
- Atualmente existem personagens do catálogo com URLs externas em `base_avatar_url`. A UI **não** as apresenta como hotlink; arte original/licenciada ainda é um backlog.
- As projeções usam somente dados públicos e não equivalem a PvP ao vivo.
- Para a execução de batalhas contra qualquer personagem ou jogador, implementar seleção com sessões e recompensas validadas no servidor (issue #80).

## QA obrigatório
1. Executar `npm test` e `npm run build` em CI; conferir o deploy correspondente à `master`.
2. Conferir Mapa, Radar, Eventos, Dojo e Arquivo de Adversários em 320, 390, 768 e 1440 pixels; verificar teclado, contraste, imagens quebradas e `prefers-reduced-motion`.
3. Testar jornada real de duas contas descartáveis: criação, login, perfil público, NPC, projeção, sessão/recompensas e tentativa inválida.
4. Não dar como homologado cenário sem evidência autenticada, ainda que CI e Vercel estejam `READY`.

_Consolida o planejamento útil da PR #75 sem trazer seus componentes de retrato obsoletos. A referência canônica de retratos passou a ser a implementação das PRs #76 e #77._
