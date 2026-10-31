# Quadro de execução — Kurokage

**Data-base:** 31/10/2026. **Fonte de prioridades:** [Roadmap integrado](ROADMAP-INTEGRADO-2026-10-31.md). Este é o quadro de trabalho; não traduz proposta em implantação.

## Convenção de estado

- `Identificado`: documento/código confirma a necessidade.
- `Implementado`: alteração presente em branch, master ou banco; não necessariamente homologada.
- `Bloqueado`: há dependência de ambiente, configuração, dados de teste ou direito de uso.
- `Homologado`: evidência funcional reproduzida com usuário controlado.
- `Publicado`: versão homologada integrada à master e deploy de produção confirmado.

## Quadro priorizado

| Ordem | Entrega concreta | Estado em 31/10 | Saída de trabalho | Dependência / issue |
|---|---|---|---|---|
| A01 | Validar consultas de perfil público e acesso owner-only; aplicar política `064` em staging e depois produção | **Bloqueado para homologação**; `063` aplicada, `064` pendente | Relatório de duas contas + políticas/grants pós-migração | #59 e #52 |
| A02 | Cadastro com e-mail novo, confirmação, login, reset, reenvio; SMTP, redirects, senha vazada | **Bloqueado por configuração/caixa de teste** | E2E de autenticação e segurança dos callbacks | #60, #53 |
| A03 | Testes de autorização e economia: missão/replay, treino, venda, inventário, jutsus, combate | **Implementação presente; não homologada** | Evidências antes/depois, recusa de usuário B e dupla liquidação | #52 |
| A04 | Revisão orientada a risco das 52 RPCs `SECURITY DEFINER` | **Inventariado; revisão parcial** | Matriz função → ownership → custos → replay → grants → testes | #53 |
| A05 | Medir Storage e política de retenção do Vercel; isolar acervo após merge #65 | **Métrica e retenção não confirmadas** | Snapshot de Usage, plano de retenção/rollback | #54 |
| B01 | Fechar direção visual: **Quartel Ninja** (escolha documentada) vs Login cinematográfico | **Conflito de direção aberto** | ADR aprovado, componentes, paleta e frames de referência originais | PR #68, #55 |
| B02 | QA da PR #68: Login, Seleção, Dashboard, Status, menu, mobile, navegação real | **Código em PR draft; sem E2E** | Screenshots 320/390/768/1440, lista de bugs, teste com 0/1/3 personagens | PR #68, #55, A02 |
| B03 | Unificar CSS e UI Kit; evitar crescimento incremental de `main.css` | **Parcial** | Tokens canônicos e componentes compartilhados, sem novas regras de negócio | B01/B02 |
| C01 | Primeiro percurso completo: e-mail → personagem → treino → jutsu → missão → PvE → recompensa → graduação | **Não homologado** | Relatório de fluxo completo, banco consistente, falhas resolvidas | A01–A04, B02 |
| C02 | Uniformizar Academia/Técnicas/Missões/Combate com o UI Kit | **Várias telas v3 já no código; padronização pendente** | Quatro fluxos com estados bloqueado, loading, custo e recibo | C01, B03 |
| D01 | Auditoria de licença/proveniência das mídias adicionadas pela PR #65 | **Pendente; material versionado na master** | Manifesto de origem/licença, política de armazenamento e exclusão de publicação pública inadequada | #54 e [#70](https://github.com/larrat/game_nt/issues/70) |
| D02 | Transformar 700 técnicas coletadas em esquema próprio de requisitos e catálogo licenciado | **Referência apenas** | Modelagem AND/OR, ligações a clã/versão e testes de autorização, sem ativação automática | D01, A04 |
| D03 | Revisar avatares/temas e evolução de personagem | **188 characters e 222 avatars no banco; fluxos parciais** | Desbloqueio × aquisição × equipamento; assets próprios | D01/D02 |
| E01 | Regras de XP, gradução, elementos, clãs, itens e cooldowns | **Divergências documentadas** | Baseline por cenário + decisão de balanceamento + migrations compatíveis | C01 |
| E02 | Phaser 2D em área isolada sem autoridade de recompensa | **Futuro/experimento** | Protótipo, FPS, bundle, controles e fallback | #56, E01 |
| E03 | Sistemas de temporada, eventos, guerra, PvP coletivo e social | **Backlog exploratório** | Especificações independentes com dependências econômicas resolvidas | E01/E02 |

## Critérios para concluir cada PR

1. **Código**: escopo pequeno, reversível, revisado e integrado sem conflito oculto com PRs abertas.
2. **Banco**: quaisquer migrations conferidas com histórico aplicado, em staging primeiro; RLS/grants e escopo de dados validados.
3. **CI**: Node 22+, `npm ci`, `npm test`, `npm run build` verdes.
4. **UX**: desktop/mobile, teclado, foco, loading/erro, ausência de overflow e movimento reduzido.
5. **Fluxo funcional**: usuário de teste, ações positivas e negativas, saldo/XP/inventário persistindo após recarregar.
6. **Operação**: preview Vercel READY, deploy produção só após critérios anteriores, rollback documentado.
7. **Evidência**: referenciar issue/PR e anexar screenshots/logs editados sem identificadores privados.

## Semanas/sprints não assumidos

Este plano define **ordem e dependências**, não promete prazos. Executar em pequenos lotes ordenados, publicando somente depois dos gates.

## Bloco inicial sugerido

**Próximos commits/ações separadas:**
1. Criar matriz de testes de duas contas e validar compatibilidade de RPCs da 063.
2. Preparar e homologar a 064, mas **não aplicar** enquanto persistirem clientes incompatíveis.
3. Resolver infraestrutura Auth e E2E de reset antes de divulgar link de cadastro.
4. Revisar a PR #68 visualmente contra a proposta Quartel Ninja, só então fundir.
5. Seguir a jornada completa com uma conta descartável, registrando cada bug reproduzido.
