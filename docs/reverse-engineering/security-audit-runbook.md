# Auditoria de segurança e testes de caracterização

## Como executar os testes do motor

No ambiente de desenvolvimento, com a versão de Node suportada pelo Vite do projeto:

```bash
npm test
```

Os testes importam diretamente `src/utils/engine.js`, não precisam de banco nem de variáveis de ambiente e fixam o comportamento atual. São testes de caracterização: a finalidade é detectar alterações involuntárias, não declarar as fórmulas balanceadas ou equivalentes ao Naruto Game.

## Como executar a auditoria Supabase

1. Abra o SQL Editor do projeto Supabase correto (de preferência staging primeiro).
2. Execute `scripts/audit_supabase_security.sql`.
3. Guarde os resultados junto com a data, a referência do ambiente e o commit da aplicação correspondente.
4. Confira especialmente: RLS habilitado, policies por tabela, argumentos reais das RPCs, grants EXECUTE para PUBLIC/anon/authenticated e `search_path` nas funções SECURITY DEFINER.
5. Não cole tokens, chaves privadas ou dados pessoais nos comentários do PR. Saída de catálogo normalmente não contém segredos, mas revise antes de compartilhar.

O script contém somente consultas SELECT a catálogos do PostgreSQL e tabelas de progresso/recompensa; não concede privilégios, não modifica tabelas e não chama as funções de jogo.

## Critérios de revisão antes de corrigir funções

- A função valida `auth.uid()` não nulo e garante que o personagem pertença ao usuário autenticado?
- O banco deriva preço, duração, XP, ryous, status do NPC e resultado da própria base em vez de confiar no cliente?
- A concessão é atômica e idempotente (repetir chamada não duplica recompensa)?
- A função SECURITY DEFINER define um `search_path` seguro e qualifica objetos?
- Os grants de execução são restritos às roles necessárias?
- Testes de autorização negativa, chamadas repetidas e concorrência existem?
