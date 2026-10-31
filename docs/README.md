# Documentação do GAME_NT / Kurokage

**Índice canônico — 31/10/2026.** Use o [roadmap integrado](ROADMAP-INTEGRADO-2026-10-31.md) como ponto de entrada para prioridades e estado de execução. Este índice não altera as especificações históricas e não declara como homologado o que foi apenas implementado.

## Regras de interpretação

- **Produção:** só depois de confirmar `master`, deploy Vercel em produção e, quando necessário, estado SQL real.
- **Implementado no código:** não implica teste autenticado ou integração à `master`.
- **Em PR:** versão proposta; não declarar publicada.
- **Documentado / referência:** hipótese, estudo ou catálogo; não implica funcionalidade, licença de arte nem dado ativo.
- **Homologado:** cenário E2E reproduzido com conta descartável e evidências sem dados privados.

## Documentação atual por área

| Tema | Fonte principal | Uso e observação |
|---|---|---|
| Instalação, deploy, configuração | [README raiz](../README.md) | Procedimentos operacionais e domínio canônico |
| Contribuição e padrões | [AGENTS.md](../.agents/AGENTS.md) | Regras de frontend; contém caminho local de referência que precisa ser removido |
| Direção de produto e arquitetura | [Roadmap integrado](ROADMAP-INTEGRADO-2026-10-31.md) | Fonte de verdade para prioridades |
| Experiência e UI | [Plano UX v2](design/ux-redesign-v2-plan-2026-10-31.md) · [catálogo de telas](design/screen-catalog-and-visual-direction-2026-10-30.md) | Propostas; validar com QA da PR #68 |
| Evidência comparativa | [Auditoria UX Naruto × Kurokage](design/naruto-game-comparative-ux-audit-2026-10-30.md) | Parcial; não copiar materiais protegidos |
| Regras e fórmulas próprias | [Combate e progressão](reverse-engineering/kurokage-combat-and-progression.md) | Caracterização histórica de código; validar contra SQL ativo |
| Treino / Academia / Combate / Status | [implementation/](implementation/) | Registro de entregas já implementadas, não um novo backlog |
| Autenticação e privacidade | [security/](security/) | Auditorias datadas; conferir status atual no Supabase |
| Pesquisa funcional do concorrente | [reverse-engineering/](reverse-engineering/) | Evidências, amostras e limites de confiança |
| Testes | [tests/](../tests/) · [workflow](../.github/workflows/engine-tests.yml) | CI unitário/contratos + build, sem E2E autenticado |
| SQL e permissões | [migrations/](../migrations/) · [scripts/audit-rpc-privileges.sql](../scripts/audit-rpc-privileges.sql) | Comparar com migrations realmente aplicadas antes de agir |

## Branches e entregas abertas

- [PR #65 — acervo de referência e seeds](https://github.com/larrat/game_nt/pull/65): dados, protótipos e arquivos coletados; grande volume de mídias de terceiros. Requer revisão de proveniência, direitos, arquitetura de conteúdo e volume.
- [PR #68 — redesign v2](https://github.com/larrat/game_nt/pull/68): Login, Seleção, Dashboard, Status, shell e preview demonstrativo; não foi homologada em conta real.
- [Issues abertas](https://github.com/larrat/game_nt/issues): #52, #53, #54, #55, #56, #59 e #60. Mantê-las relacionadas às fases do roadmap.

## Tratamento da documentação antiga

- Não apagar registros de coleta, testes nem auditorias. Eles formam histórico de decisões.
- Os dois documentos `typescript-motion-phase-1-...` e `typescript-motion-phase1-...` tratam de PRs complementares da mesma fase. Usar este índice em vez de reproduzir dois backlogs paralelos.
- `security-risk-register.md` e `feature-matrix.md` são snapshots antigos. Riscos precisam ser confrontados com `security/rpc-surface-audit...`, migrações posteriores e SQL atual.
- Não interpretar "76 rotas visitadas" como 76 fluxos validados. Bloqueios documentados refletem o estado da sessão.
- Os catálogos e protótipos presentes **somente na PR #65** devem permanecer separados do app até revisão de direitos, modelagem e integração.
- Para cada nova entrega, atualizar o roadmap e adicionar link à PR, evidência de teste e status `proposto/implementado/homologado/publicado`.
