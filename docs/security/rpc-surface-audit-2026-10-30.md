# Produção: auditoria de RPCs e pendências de integração autenticada
Data: 30/10/2026 — projeto Supabase `gvtbixbyqayhdwowgqrp`.

## Resultado verificado por SQL de leitura
Na configuração **atual** do Supabase:
- **47 funções** `SECURITY DEFINER` acessíveis ao papel `authenticated`;
- **0 funções** `SECURITY DEFINER` acessíveis diretamente ao papel `anon`;
- **0 das 47** sem referência textual a `auth.uid()`;
- **0 das 47** sem `search_path` fixado;
- **2** usam SQL dinâmico `EXECUTE format(...)`: `treinar_atributo` e `treinar_atributos`. O conjunto de campos permitidos precisa continuar fixo no servidor.
- **3 avisos informativos** `rls_enabled_no_policy` dizem respeito às tabelas de sessões `player_chunin_exams`, `player_combat_sessions`, `world_boss_sessions`; possuem acesso direto restrito.

Os indicadores acima **não comprovam ausência de falha IDOR, manipulação econômica ou replays**; `auth.uid()` presente no corpo da função não equivale a uma verificação correta de propriedade em cada caminho. Não revogar indiscriminadamente `authenticated` das RPCs que são a API do jogo.

## Funções adicionais inspecionadas nesta etapa

| RPC | Controle observado na função ativa |
|---|---|
| `aprender_jutsu` | custo vem de `jutsus.cost_ryous` e bloqueia repetição; ignora o parâmetro `p_cost` |
| `viajar_mapa` | custo fixado em 100 no servidor; ignora `p_cost` |
| `hospital_alta` | máximo de HP/Chakra e preço vêm do estado e do inventário do servidor, não de `p_max_*` |
| `desbloquear_avatar_templo` | requisitos de nível e alvo vêm do catálogo; `p_req_level` ignorado |
| `entrar_cla` | valida propriedade, distribuição exatamente 7 pontos e chaves permitidas |
| `modificar_jutsu_slots` | custo de upgrade = 500 × estrelas; ignora `p_upgrade_cost` |
| `treinar_atributo` | ignora limites enviados pelo navegador e aceita somente campo em lista explícita |
| `concluir_story_quest` | valida propriedade, quest ativa, pré-requisito, conclusão não repetida e objetivo combat por histórico servidor |
| `reivindicar_bonus_diario`, `reset_daily_progress` | valida propriedade, data UTC e bloqueio de repetição dentro da mesma data |
| `promover_graduacao` | valida próxima graduação e requisitos de catálogo; ignora promoção arbitrária |
| `doar_vila` | exige 100.000 Ryous e verifica saldo sob trava do personagem |
| `iniciar_exame_chunin` | valida personagem, graduação e sessão de exame |
| `marcar_jogador_derrotado`, `trair_vila` | verificam propriedade; ações voluntárias de estado requerem teste funcional |

Os comportamentos foram observados na **definição da função** por consultas de leitura. Não foram executados RPCs mutadores de produção com jogadores existentes. Outros endpoints permanecem para revisão individual.

## Verificação repetível

Copiar `scripts/audit-rpc-privileges.sql` no SQL Editor do projeto. O script executa três consultas `SELECT` de leitura; não muda funções, linhas ou privilégios. Salvar resultado e comparar com o baseline acima antes de alterações significativas na economia.

`src/types/database.generated.ts` contém a estrutura TypeScript do schema Supabase atual, **sem dados pessoais ou tokens**. Regenerar o arquivo depois de cada migração em produção e manter o `tsc --noEmit` no build.

## Pendências que NÃO foram encerradas

1. Criar duas **contas descartáveis** no ambiente de teste, com personagens sem progresso de usuários reais. Validar em especial: iniciar e concluir missão, não poder repetir recompensa, tentar modificar personagem de outra conta, compra/consumo, venda de itens, refinamento de favorito, treinamento e combate.
2. Injetar valores manipulados de custo em chamadas de teste, sem usar personagens ou valores de produção reais. Verificar que servidor ignora valores inconsistentes.
3. Rever individualmente as 47 funções sob perspectiva de IDOR, concorrência/transações e recompensas; o alerta do advisor continuará até que cada função seja analisada e a arquitetura justificadamente revista.
4. A proteção de senha vazada `auth_leaked_password_protection` segue como aviso no **painel Auth** e não pode ser ativada por este conector de SQL. Ver [documentação](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
5. Testes manuais autenticados das telas em desktop e mobile ainda pendentes. A análise do Naruto Game atual depende de navegador com sessão compartilhada.
6. A ocupação histórica exata de **Deployment Storage** na Vercel não pôde ser consultada pelas ferramentas disponíveis. Revisar Usage e retenção de deploys antigos no painel sem deletar o deploy ativo.

## Estado
Auditoria de leitura ampliada e tipos gerados: **concluídos**. Cobertura integral de segurança e E2E autenticado: **não concluídos**.
