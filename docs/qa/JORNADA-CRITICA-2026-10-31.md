# Matriz de QA — Primeiro percurso completo do Kurokage

**Status:** planejado, **não executado**. Usar staging quando possível; criar duas contas descartáveis A e B e e-mails sob controle da equipe. Não usar personagens reais, credenciais no repositório ou dados pessoais em prints.

## Preparação e gates

- Snapshot de configuração e migrations, sem dados privados.
- Confirmar SMTP, Site URL e Redirect URLs, Confirm Email ativo e proteção a senhas vazadas.
- Confirmar RPCs públicas de perfis já disponíveis (`063`) antes da política owner-only (`064`).
- Preparar dois jogadores diferentes, sem dados reais ou progresso preexistente.
- Marcar commit, deploy e versão de schema para permitir reprodução.

| ID | Teste com conta A e B | Resultado obrigatório | Depende de |
|---|---|---|---|
| AUTH-01 | A cadastra e-mail inédito; abre confirmação; faz login | Link no domínio correto, usuário confirmado e sessão coerente | SMTP/URLs |
| AUTH-02 | A solicita reset, usa link válido; B tenta link expirado/inválido | A vê formulário de senha nova; link inválido não autoriza redefinição | Auth |
| AUTH-03 | Repetir cadastro de A e solicitar reenvio | Não prometer mensagem enviada sem confirmação de entrega | Auth |
| CHAR-01 | A cria 1º/2º/3º personagem; tenta criar 4º | Três permitidos, 4º bloqueado no servidor, inclusive concorrência | RPC criação |
| CHAR-02 | A seleciona personagem e B tenta ler `players` de A | B não lê registro privado; perfil resumido de A aparece se permitido | 063/064 |
| CHAR-03 | B tenta exclusão ou atualização de personagem A; A tenta remover com nome errado | Operação recusada sem mutação; exclusão só em personagem de teste | RPC exclusão |
| NAV-01 | A abre Dashboard, Status, Ranking, Vila, Mapa e Dojo | Rotas funcionam com `players` owner-only; campos públicos limitados | 063/064 |
| TRAIN-01 | A treina atributo com saldo; repete/usa quantidade inválida | Só uma execução válida debitada; saldo e status atualizados no servidor | `treinar_atributos` |
| JUTSU-01 | A aprende técnica elegível; tenta bloqueada; se aplicável, lote VIP | Custo e requisitos do catálogo, duplicidade rejeitada | Catálogo e RPC |
| TASK-01 | A inicia missão; tenta concluir antes do tempo | Timer e elegibilidade no servidor; sem recompensa antecipada | RPC missão |
| TASK-02 | A conclui e tenta reiniciar ou liquidar a mesma missão | XP/Ryous pagos uma única vez; carga idempotente | 060 |
| ITEM-01 | A compra e usa consumível; tenta quantidade acima do limite | Inventário, recursos e moeda persistem; custo no servidor | RPC comércio |
| ITEM-02 | A tenta vender/refinar equipado ou favorito | Recusa sem consumo acidental; rollback preserva ambos | 061 |
| BATTLE-01 | A inicia PvE, usa habilidade, aguarda cooldown e conclui | Ações, turnos e custos validados por RPC; um único resultado final | Combate sessão |
| BATTLE-02 | A reenvia finalização ou usa sessão obsoleta; B tenta interferir | Nenhuma segunda recompensa, nenhum acesso entre contas | Combate/RLS |
| PROG-01 | A completa requisitos de graduação e recarrega todas as telas | Nível/rank/atributos/XP persistem sem divergência inexplicada | Motor e RPCs |
| UX-01 | Executar principais cenários a 320/390/768/1440px | Sem overflow, foco visível, uso por teclado/toque, modais e menus corretos | UI kit |
| UX-02 | Reduzir movimento no SO e usar leitor de tela nos botões críticos | Sem animação obrigatória; nomes/estados acessíveis | Motion |

## Modelo único de evidência

Registrar `ID do teste | commit | ambiente | cenário | estado anterior (sem PII) | ação | resposta do servidor | estado posterior | resultado | bug/PR`.

Para testes mutadores, use screenshots com nomes substituídos ou cortados e exporte apenas valores sintéticos. Não copiar cookies, JWTs, links PKCE, emails ou IDs de contas.

## Release gate

**Impedir merge/publicação da 064 e do redesign como "homologado"** enquanto AUTH-01/02, CHAR-02, NAV-01, TASK-02 e BATTLE-02 não tenham evidências satisfatórias. Build verde sozinho não significa gate concluído.
