# Dados privados dos jogadores — migração segura de perfis públicos
Data: 30/10/2026 · Issue #59 · Duas fases, com CI e monitoramento entre etapas.

## Exposição encontrada
Antes da correção, `public.players` tinha `SELECT authenticated USING (true)` e a tabela incluía colunas como `user_id`, saldo, inventário de evolução, atributos, histórico e dados de missão. Qualquer usuário autenticado com a chave pública podia consultar todas essas colunas de qualquer jogador, independentemente de o frontend filtrar as consultas próprias. Isso é um vazamento de privilégio de leitura, não uma simples falha visual.

## Etapa 1: RPCs com projeções explícitas
Migração `063_public_player_profiles.sql` adiciona quatro endpoints SECURITY DEFINER com `search_path` fixado e execução somente `authenticated`:
- `listar_perfis_ninja(p_village_id,p_limit)`: apenas ID de personagem, nome, classe, nível, XP, vila, graduação, retrato e elemento; p_limit máximo 500.
- `listar_lideres_vila()`: um nome, classe, nível e vila por vila, baseado no maior nível/XP.
- `contar_ninjas_vila()`: agregados de habitantes por vila, sem informação pessoal.
- `listar_rivais_dojo(p_player_id,p_min_level,p_max_level,p_target_ranks)`: proprietário verificado por `auth.uid()`, somente rivais da mesma vila e faixa/graduação solicitadas, máximo 5; retorna atributos necessários ao espelho de combate, IDs das técnicas (não os slots) e nenhum dado de saldo ou identidade de conta.

O frontend passa a usar os endpoints nas telas `Ranking.jsx`, `Vila.jsx`, `Criar.jsx`, `Mapa.jsx`, `Dojo.jsx`. `App.jsx`, `Selecionar.jsx` e `Exame.jsx` continuam acessando o registro próprio, filtrado por usuário. `Mapa.jsx` não usa mais HP/Chakra de jogadores reais para fantasmas: os atributos são estimativas de NPC feitas por nível, como já acontecia no fallback. Corrigida a exceção `charCodeAt` sobre um ID inteiro.

**Compatibilidade:** aplicar a migração 063 primeiro; o frontend anterior continua funcionando enquanto a política ampla de SELECT permanece ativa.

## Etapa 2: ativar privacidade da tabela inteira
**Somente após o frontend novo estar em produção e verificado**, aplicar `064_private_player_select_rls.sql`:
`players_select_authenticated` removida, substituída por `players_select_own USING(user_id=(SELECT auth.uid()))`.

As funções de exibição restrita continuam operando sob SECURITY DEFINER, sem expor `players` por SELECT amplo. Dados completos do jogador só podem ser lidos pelo dono da conta. A policy existente de UPDATE próprio e a proteção server-authoritative das transações continuam intactas.

## Validação
- CI: `npm ci`, `npm test`, `npm run build`.
- Preview Vercel READY antes do merge.
- Testes SQL via `SELECT` de assinatura/grant/política (nenhum INSERT/UPDATE/DELETE de dados).
- Após 063, verificar RPCs usando sessão autenticada controlada; após 064, provar que consulta de jogador de outra conta não traz linha.
- Verificar ranking, mapa, seleção e Dojo com personagens **descartáveis**. Não usar dados reais em operações destrutivas.
- Só fechar a issue #59 após confirmar os fluxos e a política de produção.

## Limites
- No banco atual, `players.has_bijuu` não existe; a caçada às Bijuus consulta campo inválido no código anterior. O botão agora informa temporariamente indisponível; implementação real exige modelo Jinchuuriki e validação do servidor.
- Os oponentes de Dojo ainda são representações de combate calculadas em React; a resolução e liquidação de recompensas continuam sob regras existentes. Recomenda-se revisão adicional de coerência das regras PvP.
- O teste ponta a ponta de login, confirmação de e-mail e recuperação de senha da issue #60 depende de caixas de correio de teste e acesso autenticado no navegador.
- Uma eventual integração externa que ainda faça SELECT completo de `players` para jogadores alheios precisará migrar às novas RPCs.
