# Correção do cadastro e do ciclo de personagens — 30/10/2026

## Escopo

- A tela `Login.jsx` continua usando `supabase.auth.signUp`, `signInWithPassword` e `resetPasswordForEmail`. O redirecionamento de confirmação é `/selecionar`; é preciso configurar essa URL no painel do Supabase Auth.
- `Criar.jsx`: valida nome de 3 a 24 caracteres, consulta apenas a contagem de personagens da própria conta, distingue catálogo vazio/indisponível de nenhum personagem, evita envio duplicado e torna avatar/vila/classe navegáveis por teclado. Contagens de vila desconhecidas exibem traço, não zero fictício.
- `Selecionar.jsx`: exclusão por `excluir_personagem`, com digitação obrigatória do nome exato, confirmação de resposta do servidor e filtro de personagens local somente após sucesso. Exclui também progresso, inventário e histórico; operação é irreversível.
- `App.jsx`: reconsulta de personagem vincula tanto `id` quanto `user_id` da sessão; outras rotas de ranking permanecem com o modelo de leitura atual.
- Migração `062_secure_character_registration_and_deletion.sql`: mantém os atributos iniciais originais na `criar_personagem`, impõe limite de 3 por `auth.uid()` sob `pg_advisory_xact_lock` (protegendo concorrência), cria RPC de exclusão apenas para dono com nome digitado; remove logs antes de apagar o player, deixando as FKs `ON DELETE CASCADE` limparem dados dependentes. Nenhum personagem é apagado ao **aplicar** a migração. Permissões `anon` revogadas para ambas as funções.

## Rollout seguro

1. Commit e CI do frontend + migration.
2. Aplicar a migração de forma compatível com o frontend anterior: a nova RPC só será usada após o deploy; o limite de criação passa a valer imediatamente.
3. Verificar via SQL de leitura: definição de ambas RPCs, grants e versão da migration; sem criar, excluir ou alterar personagens reais.
4. Merge após CI verde, produção Vercel READY e verificação de aliases.

## Itens ainda não homologados

- Não realizamos cadastro real nem criação/exclusão com conta descartável. Testes estáticos e build não substituem teste E2E.
- `players` ainda usa uma policy `SELECT authenticated USING (true)`, necessária para usos antigos de ranking, perfis e encontros PvP. É um risco de exposição de campos privados: planejar view pública de perfil + leitura de dados sensíveis somente ao próprio dono, após rastrear cada consumidor para evitar quebra das rotas. **Não mudar RLS globalmente sem migrar esses consumidores.**
- Confirmar `Site URL`, Redirect URLs, SMTP e `Confirm email` no painel Supabase. A API atual não ofereceu leitura confiável dessas configurações. A proteção contra senha vazada também segue pendente no painel Auth.
- Testar duas contas isoladas em projeto de staging antes de lançar um formulário de autoatendimento para exclusão de contas produtivas.

## Por que não remover personagens por DELETE da tabela

As grants atuais permitem SELECT mas não DELETE em `public.players`; e registros de `battle_logs` têm FK sem CASCADE. A RPC resolve ambos sem conceder exclusão ampla a todo cliente.
