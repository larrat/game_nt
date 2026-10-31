# Liberação controlada da política de privacidade dos jogadores

**Diagnóstico em 31/10/2026.** Esta ficha detalha a issue [#59](https://github.com/larrat/game_nt/issues/59) e integra o [roadmap](../ROADMAP-INTEGRADO-2026-10-31.md). **Não constitui autorização para executar migrations na base produtiva.**

## 1. Evidência real (SQL de metadados, sem ler personagens)

| Verificação | Resultado de 31/10 |
|---|---|
| RLS de `public.players` habilitada | **Sim** |
| Política ampla `players_select_authenticated` presente | **Sim**, `USING (true)` |
| Política `players_select_own` instalada | **Não** |
| RPCs públicas restritas (de 4 esperadas) | **4** |
| Migração `063_public_player_profiles` | Registrada no histórico de migrations |
| Migração `064_private_player_select_rls` | **Não** registrada/aplicada |

As quatro RPCs publicam apenas campos específicos para leitura de rankings/vila, contagem de habitantes e descoberta controlada de rivais. Isso não substitui um teste de autorização do ponto de vista do usuário.

## 2. Mapa de consumidores do registro completo

Revisão dos arquivos `src/pages/*.jsx`, `src/App.jsx` e principais componentes/utilitários:

| Arquivo | Uso | Prontidão |
|---|---|---|
| `src/App.jsx` | Recarrega o personagem atual com `id` **e** `user_id=session.user.id` | Compatível com owner-only em análise estática |
| `src/pages/Selecionar.jsx` | Lista somente personagens com `user_id=session.user.id` | Compatível em análise estática |
| `src/pages/Criar.jsx` | Conta personagens da conta para limitar espaços; filtro `user_id=session.user.id` | Compatível em análise estática |
| `src/pages/Exame.jsx` | Lê `passou_exame_chunin` do `player.id` selecionado | Requer prova com sessão e ownership; RLS deverá restringir o id |
| `src/pages/Ranking.jsx` | Usa `listar_perfis_ninja` / `listar_lideres_vila` | Dependente da RPC 063 |
| `src/pages/Vila.jsx` | Usa `listar_lideres_vila` | Dependente da RPC 063 |
| `src/pages/Mapa.jsx` | Usa `listar_perfis_ninja` | Dependente da RPC 063 |
| `src/pages/Dojo.jsx` | Usa `listar_rivais_dojo` | Dependente da RPC 063 |

Este mapa foi obtido por análise estática, não garante cobertura de aplicações externas, arquivos fora de `src` ou consumidores novos. Um teste de regressão preparado na [PR #71](https://github.com/larrat/game_nt/pull/71) bloqueia novos leitores diretos não inventariados.

## 3. Gates de liberação da migração 064

1. Criar ambiente staging com esquema e configurações relevantes, sem transferir dados identificáveis de jogadores reais.
2. Disponibilizar contas A e B descartáveis, cada uma com personagem próprio e progressão de teste.
3. Rodar `scripts/preflight-private-player-rls.sql` da PR #71: quatro RPCs presentes e restritas a `authenticated`, RLS ligado, política atual registrada. O SQL não lê nenhuma linha de jogador.
4. Em staging, aplicar `064_private_player_select_rls.sql` por procedimento de migration aprovado. Conferir `players_select_own` ativa e política ampla ausente.
5. Com sessão de A: leitura do próprio personagem funciona; leitura de B por tabela não retorna dados privados. Repetir de B contra A.
6. Testar Ranking, Vila, Mapa e Dojo para jogadores próprios e rivais autorizados; revisar especificamente `Exame.jsx`, seleção e criação 0–3 personagens.
7. Cobrir callbacks de autenticação e reconexão para evitar página branca ao recuperar a sessão.
8. Comparar logs e regressões; aprovar relatório anexado à issue #59, com dados anonimizados.
9. Só então programar rollout controlado em produção, com ponto de restauração e monitoramento das cinco telas dependentes. Se falhar, interromper rollout e restaurar uma versão coerente de frontend/policies com procedimento de incidente aprovado — **não** abrir leitura ampla automaticamente.

## 4. Proibições e limitações

- **Não executar 064 automaticamente no banco produtivo** por passar testes estáticos ou CI.
- Não criar dois usuários fictícios diretamente em tabelas de autenticação de produção para testar RLS.
- Não usar `service_role`/postgres como evidência de restrição entre usuários: essas credenciais podem ultrapassar RLS.
- Não inserir JWT, e-mail, senha, IDs pessoais, payloads privados ou registros completos em PRs e logs.
- Sem E2E autenticado, o status é **pronto para testar em staging**, não `homologado` ou `corrigido em produção`.
