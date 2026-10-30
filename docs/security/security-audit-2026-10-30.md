# Auditoria de integridade e superfícies privilegiadas — 30/10/2026

## Escopo
Inspeção *somente leitura* das permissões e funções `SECURITY DEFINER` do Supabase em `gvtbixbyqayhdwowgqrp`, antes de mudar a lógica de missões. Nenhum jogador foi usado para testar ou explorar valores; consultas a tabelas sensíveis limitaram-se a contagens e metadados.

### Inventário observado
- **47 RPCs `SECURITY DEFINER` executáveis por `authenticated`**: as 47 contêm `auth.uid()` no corpo e **nenhuma** concede `EXECUTE` a `anon`. Isso não comprova segurança funcional: a revisão de IDOR, valores econômicos e fluxos deve continuar por função.
- `players`: existe política RLS para leitura entre usuários (provavelmente adequada para rankings, a validar) e política `UPDATE` para dono; privilégios de coluna econômicos não estavam diretamente concedidos a `authenticated` na verificação feita.
- `player_chunin_exams`, `player_combat_sessions` e `world_boss_sessions` têm RLS ativado sem políticas, **mas não possuem SELECT/INSERT/UPDATE concedidos a `anon` ou `authenticated`**. A ausência de policies é coerente com acesso apenas por RPC confiável e `service_role`, e não autoriza abrir tabelas indiscriminadamente.
- Sobrecarga `reivindicar_recompensa_diaria(integer,integer,text,integer)` admite valores fornecidos pelo cliente em uma versão legada. **É `SECURITY INVOKER`, sem EXECUTE para `authenticated` ou `anon`, concedida somente a `service_role`**. Não foi constatada exploração por usuário normal; revisar se o serviço ainda precisa desse endpoint, sem removê-lo cegamente.
- `reivindicar_recompensa_diaria(integer,text)` valida dono, tarefas e valores fixos, com `EXECUTE` autenticado.

## Vulnerabilidade corrigida nesta entrega: replay de missão

### Antes
`iniciar_missao` verifica conta, nível, catálogo, slots e missões em andamento, mas **não consulta `players.completed_missions`**. Assim um cliente que ignore o bloqueio do frontend pode iniciar novamente uma missão já concluída; `finalizar_missao` até preservava o ID sem duplicar, mas ainda adicionava XP e Ryous novamente.

### Depois — migração `060_block_replayed_mission_rewards.sql`
1. A função de início verifica `completed_missions` sob `FOR UPDATE`, recusa missão concluída e não cria sessão nova.
2. A função de finalização também recusa conclusão repetida **antes de calcular XP** (defesa em profundidade).
3. O estado JSON deve ser array; estados corrompidos falham sem conceder recompensas.
4. Temporizadores, requisitos, valores de recompensa e autorização continuam decididos no servidor. Parâmetros de duração e pagamento fornecidos pelo cliente permanecem ignorados.
5. RPCs continuam com `SECURITY DEFINER`, `search_path` fixo, sem permissão a `anon` e com concessão apenas a `authenticated` (e credenciais privilegiadas já existentes).
6. **Não há migração ou reset de progresso de personagens.** Caso haja uma sessão já ativa para missão anteriormente concluída, a conclusão será recusada; isso evita crédito extra, mas poderá exigir tratamento administrativo dessa sessão inconsistente.

### Verificação
- Unitários/contrato: `tests/missionReplaySecurity.test.js`.
- CI GitHub: `npm test` + `npm run build`.
- SQL após publicação: confirmar o texto das RPCs, grants e array containment, mantendo contagens de jogadores/atributos.
- Teste de tentativa de repetição *apenas com conta de teste* (não alterar progresso de usuários reais).

## Pendências de segurança
- [ ] Revisão de BOLA/IDOR, valor de parâmetros de clientes e controle de repetição nas demais RPCs com recompensa, compra e combate. Alerta de 47 funções não deve ser silenciado por revogar `authenticated` indiscriminadamente.
- [ ] Proteção contra senhas vazadas: ativar `Leaked Password Protection` em Supabase **Auth** por configuração de dashboard, após conferir política de senha e comunicação a usuários.
- [ ] Validar funcionalidades com conta autenticada: repetir missão concluída, tentar chamar missão de outro personagem, iniciar missão sem requisito, concluir antes do relógio.
- [ ] Revisar necessidade da RPC legada `reivindicar_recompensa_diaria` exclusiva de `service_role`.
- [ ] Avaliar RLS `players` com dados sensíveis; leitura pública entre contas depende do uso de rankings.
- [ ] Mapear migrações históricas e garantir que futuras funções privilegiadas sejam auditadas individualmente.

Fontes de referência:
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/observability/advisors?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
