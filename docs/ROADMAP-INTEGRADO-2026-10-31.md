# GAME_NT / Kurokage — Auditoria integral e roadmap priorizado

**Snapshot:** 31/10/2026. **Repositório:** `larrat/game_nt`. **Ambiente:** Supabase `gvtbixbyqayhdwowgqrp`; Vercel `game-nt`, branch de produção `master`.

## 1. Inventário e confiança

Na `master` **após o merge da PR #65**: 45 documentos Markdown sob `docs/`, 30 arquivos `src/pages/*.jsx`, 21 arquivos de testes, 71 arquivos de migração SQL, aproximadamente 91,8 MB de assets em `public/` e `src/styles/main.css` de aproximadamente 160 kB. A PR #65 acrescentou mídias coletadas em `docs/`, fora do diretório público da aplicação. A UI documenta 25 rotas autenticadas. Código versionado, testes de contrato e deploy READY **não** são E2E funcional.

Situação das PRs:
- [#65](https://github.com/larrat/game_nt/pull/65): **integrada à master em 31/10/2026**. Incorporou 17 documentos Markdown novos (16 em `docs/`, um em `data/reference/`), 41 JSON de análise e aproximadamente 1.135 mídias de referência (cerca de 222 MiB). A documentação registra 239 nomes do Templo, 767 versões, 550 temas VIP e 700 jutsus catalogados (320 de clã, 140 gerais, 230 elementais, 10 portões), com custos/requisitos observados **não** necessariamente compatíveis com o schema atual. Possui três protótipos HTML, dos quais o arquivo índice registra **Quartel ninja** como opção escolhida. Seed de 184 personagens/191 avatares foi aplicado anteriormente, conforme a PR; conferido abaixo. A presença de mídias de terceiros **não confere licença de reutilização nem publicação**.
- [#68](https://github.com/larrat/game_nt/pull/68): base visual + CSS `experience-v2.css`, alterações em Login, Seleção, Dashboard, Status e shell, preview demonstrativo. Branch em draft, testes e build aprovados; teste com sessão real ainda pendente. **Não confundir com produção.**

**Verificação SQL de leitura em 31/10/2026:** catálogo `characters`: **188**; `avatars`: **222**; `jutsus`: **57**. A PR #65 documenta 700 jutsus adicionais **somente como dados de referência**, não como 700 jutsus aptos a serem aprendidos no banco.

**Verificação SQL de segurança:** `public.players` ainda possui policy `players_select_authenticated` `USING (true)`. A migração de APIs públicas `063_public_player_profiles` foi registrada como aplicada; a fase owner-only `064_private_player_select_rls` não aparece entre as migrations aplicadas. O Advisor atual lista **52** funções `SECURITY DEFINER` executáveis por `authenticated` e nenhuma por `anon`, três tabelas com RLS sem policy (service-only, verificar grants) e um aviso de senhas vazadas. As 52 funções são uma **superfície a auditar**, não 52 exploits demonstrados.

## 2. Decisões de arquitetura que devem permanecer

1. React 19 + Vite 8 + Tailwind 4 híbrido + Motion + TypeScript incremental; Supabase/PostgreSQL como autoridade; Vercel para deploy. Não migrar stack sem problema medido.
2. O banco decide ações, preços, dano, XP, loot e recompensas. O React apresenta estado e envia intenções; nunca recebe autoridade sobre resultado.
3. Proteger identidade do Kurokage: pesquisas do Naruto Game fornecem referências funcionais, não licença para código, arte, marcas, textos ou mídia.
4. Evoluir UX por componentes compartilhados, com transição gradual do CSS legado, não adicionar uma folha grande de exceções a cada rota.
5. Mudanças de segurança e balanço exigem staging, migrações revisadas, teste negativo, evidência e rollback; não modificar jogadores reais para homologação.

## 3. Roadmap por entregas e dependências

| Ordem | Prioridade | Entrega | Dependências | Aceite verificável |
|---|---|---|---|---|
| 0.1 | **P0** | Privacidade de `players` (#59): inventariar consumidores; testar as quatro APIs da 063; executar e verificar a 064 em staging e somente depois em produção | Duas contas descartáveis, snapshots e controle de rollout | Usuário A não lê registro completo B; ranking, Vila, Mapa, Dojo e Seleção funcionam |
| 0.2 | **P0** | Auth (#60): SMTP próprio/domínio verificado, Site URL/Redirect URLs, confirmação de e-mail, recuperação real de senha e proteção contra senhas vazadas | Admin Auth, caixa postal de teste | Novo cadastro/confirmar/login/resetar funcionam; link inválido não autoriza uso indevido |
| 0.3 | **P0** | QA de integridade (#52/#53): dois usuários, missões/replay, compra, venda/refino favorito, treinamento, jutsus e encerramento de combate; inventário das 52 RPCs por risco | Ambiente de teste e cenários determinísticos | Transações atômicas, ownership, resultado único e custos de servidor demonstrados |
| 0.4 | **P0 condicional** | Uso/retention Vercel (#54): distinguir Deployment Storage de transferência; medir quantidade por deploy e risco de limite | Acesso ao painel de Usage | Valor medido e política segura de retenção sem apagar produção/rollback |
| 1.1 | **P1** | Unificar direção de arte: confrontar a seleção **Quartel ninja** da PR #65 com a estética cinematográfica da PR #68 e decidir o layout canônico | Aprovar conceito navegável com demonstração desktop/mobile | Guia de cores/tipografia/componentes/ícones/ilustrações originais + estados de UI |
| 1.2 | **P1** | Homologar PR #68 no login, escolha, Dashboard, Status e shell (0/1/múltiplos personagens; 320/390/768/1440px; teclado) | 0.2 + 1.1 para experiência autenticada | Sem overflow, sem valores fictícios, callbacks/links funcionando, capturas e CI |
| 1.3 | **P1** | Vertical slice jogável: cadastro → personagem → treino → jutsu → missão → combate PvE → XP/loot → graduação | 0.1–0.3 e base de UI | Jornada reproduzível ponta a ponta com usuário novo, logs e resultados persistidos |
| 1.4 | **P1** | Integrar UX de Treino, Técnicas, Tarefas, Combate (já possuem `academy-v3`, `combat-v3`) ao design system único | 1.1–1.3 | Estimativa diferente de resultado, bloqueio com motivo, custo/cooldown visível, sem reescrever RPCs |
| 2.1 | **P1/P2** | Auditar e organizar o acervo **já incorporado pela PR #65**: dataset estruturado, seeds idempotentes, protótipos e mídia de referência privada; remover do fluxo de publicação qualquer material sem licença | Direitos/proveniência, métrica de repositório/deploy, QA de catálogo | Mídias sem licença não são servidas; catálogo original rastreável e importação reexecutável |
| 2.2 | **P2** | Modelar técnica/clã/versão/tema: AND/OR, classes, desbloqueios, requisitos e custos no servidor | 2.1 + revisão da autoridade SQL | Catálogo verdadeiro com status aprendido/bloqueado, sem dar acesso indevido; sem habilitar 700 técnicas automaticamente |
| 2.3 | **P2** | Normalizar progressão e balanço: JS × SQL, XP, status, graduações, passivas, elementos e itens | E2E básico e testes de caracterização | Comparações por cenários; mudanças de fórmula versionadas sem afetar inadvertidamente contas existentes |
| 2.4 | **P2** | Vila, economia, ranking, equipes, inventário, hospitais e módulos secundários | 0.1–0.3, 1.1 | Fluxos autorizados, estados vazios e móveis testados |
| 3.1 | **P3** | Combate 2D Phaser prototipado isoladamente (#56) | Servidor de combate estável + orçamento de performance | FPS mobile, fallback e acessibilidade; animação só após evento confirmado pelo servidor |
| 3.2 | **P3** | Sistemas ampliados: talentos, invocações, temas, eventos, temporadas, guerra e social | Núcleo estável, modelo econômico e conteúdo aprovado | Entregas individuais com métricas e testes específicos |

### Ordem sugerida de PRs

1. `fix/security-private-players-phase2` — validar 063/064, dois usuários, deploy com gates.
2. `fix/auth-email-and-recovery-e2e` — configurações administrativas + testes de ponta a ponta.
3. `test/gameplay-economic-integrity` — missões, compras, combate, revisão de 52 RPCs em lotes de risco.
4. `design/kurokage-visual-decision` — reconciliar protótipo Quartel ninja com a PR #68, design tokens e aceitação.
5. `feat/ui-onboarding-dashboard-status` — integrar a PR #68 após QA e revisão, ou dividir componentes se necessário.
6. `feat/ui-academy-combat` — telas restantes do percurso crítico.
7. `content/catalog-normalization` — sanear e separar o acervo da PR #65 **já integrado na master**, manter arquivos de referência fora da distribuição e só usar assets próprios/licenciados.
8. `feat/progression-and-secondary-systems` — depois do núcleo estabilizado.

## 4. Contradições / documentação a limpar

| Tema | Leitura antiga ou divergente | Regra de uso atual |
|---|---|---|
| Segurança do banco | `security-risk-register.md` descreve riscos em RPCs SQL antigas | Distinguir achados históricos de contratos ativos já corrigidos; investigar as 52 funções atuais, não reproduzir advertências antigas como fatos |
| `players` privado | `private-players-and-public-profiles` descreve as fases 063/064 | 063 aplicada; **064 pendente**, comprovado por policy atual |
| Jutsus | Catálogo de 700 técnicas **agora versionado na master após PR #65** | Apenas 57 linhas na tabela `jutsus`; catálogo extra é referência, não gameplay ativo |
| Redesign | PR #68 traz fundo cinemático; PR #65 documenta seleção de Quartel ninja | Reconciliar antes de declarar a identidade final aprovada |
| TypeScript | Dois documentos de "phase 1" com nomes quase iguais | Históricos complementares de PRs #43/#44, não dois projetos a executar |
| Bloqueio de telas concorrentes | 36 telas com "acesso negado" na coleta inicial | Estado contextual de sessão, não requisito permanente comprovado |
| 47 RPCs | Auditoria de 30/10 | Baseline 31/10: **52**; repetir auditoria após migrations |
| Build e publicação | CI e Vercel READY | Aprovação do build não substitui teste funcional autenticado |
| Design system externo | AGENTS aponta para caminho `/Users/larrat/.gemini/...` | Migrar referência autoritativa para documentação versionada, sem depender de máquina pessoal |
| Versão do produto | `package.json` ainda usa `temp-app` e `0.0.0` | Ajustar metadados quando pipeline e release estiverem estabilizados |

## 5. Critérios globais de pronto

Uma tarefa é **concluída em produção** apenas se: (a) mudança e dependências estiverem integradas à `master`; (b) CI `npm ci && npm test && npm run build` verde; (c) Vercel `READY`; (d) E2E em staging ou usuário de teste com caminhos positivo/negativo, responsividade e acessibilidade; (e) mudanças SQL reconciliadas com migrations e políticas reais; (f) evidência versionada sem dados pessoais e ticket/PR atualizados.

**Não executado nesta auditoria:** testes com contas autenticadas, alterações SQL, acionamento de RPCs mutadoras, descarte de mídia, remoção de deploys ou publicação de produção. Foram feitas leituras do repositório e consultas agregadas/policies no Supabase.

## 6. Próximos passos imediatos

- Priorizar **a privacidade owner-only**, configurando ambiente de duas contas e verificando consumidores das RPCs públicas.
- Configurar SMTP e URLs de Auth corretamente; confirmar o ciclo cadastro/login/reset antes de abrir beta.
- Medir uso efetivo de Vercel e volume do Git depois do merge da PR #65; a [issue #70](https://github.com/larrat/game_nt/issues/70) trata da classificação de direitos de uso e isolamento do acervo, sem exclusão inadvertida de evidências nem alteração de deploys ativos.
- Consolidar identidade visual conforme a escolha de Quartel ninja e revisar visualmente PR #68, ainda aberta em draft.
- Fazer uma rodada vertical real de gameplay e registrar buglist priorizada.
