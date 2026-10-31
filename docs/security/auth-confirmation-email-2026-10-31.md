# Cadastro e confirmação por e-mail: diagnóstico de 31/10/2026

## Evidência real no projeto Supabase
- Os registros recentes do Auth marcam tentativas `POST /signup` como `user_repeated_signup` (status 200), não como criação de novos usuários.
- Verificação agregada de `auth.users`: uma conta existente, e-mail confirmado, sem novos usuários nas últimas 24 horas.
- A conta relacionada aos eventos de cadastro repetido foi criada em junho de 2026 e **já estava confirmada**.
- Supabase usa respostas intencionalmente opacas em cadastros repetidos. `signUp()` sem `session` não prova que um e-mail foi enviado.

## Entrega
- `Login.jsx` agora diferencia resposta pendente de cadastro e sucesso de sessão; não promete confirmação enviada.
- Adiciona estado explicativo com ações Entrar, Esqueci minha senha e reenvio de confirmação por `supabase.auth.resend({type:'signup'})`.
- Reenvio informa solicitação, não entrega; bloqueia múltiplas solicitações no estado atual.
- Mapeamento de erros de Auth: `email_address_not_authorized`, `over_email_send_rate_limit`, `invalid_credentials`, `email_not_confirmed`, rate limits e usuário já existente.
- Testes unitários de mensagens e contratos do frontend.
- Nenhuma senha, token ou endereço de e-mail real foi armazenado no repositório; não foi criada nem removida conta.

## Bloqueio de infraestrutura
O SMTP padrão do Supabase Auth é limitado a membros previamente autorizados da equipe do projeto e a um volume muito baixo de e-mails. Para receber confirmação em endereços comuns, o administrador deve configurar SMTP próprio (ex.: Resend, Brevo, Postmark, SES) com domínio/remetente verificado, SPF, DKIM e DMARC.

Caminho: Supabase Dashboard → Authentication → SMTP Settings. Conferir também **Authentication → URL Configuration** para `https://game-nt.vercel.app`, `https://game-nt.vercel.app/selecionar` e `https://game-nt.vercel.app/redefinir-senha`; e Authentication → Providers → Email (Confirm Email habilitado). Configurações de SMTP/URL não estavam disponíveis para edição pelo conector usado; não desativar a confirmação como solução.

## Aceite E2E ainda necessário
- Confirmar conta usando e-mail **novo**, sob controle da equipe, e verificar criação, entrega, link, login e primeiro personagem.
- Confirmar repetição com e-mail já cadastrado não implica novo e-mail.
- Testar recuperação da senha e expiração de link.
- Fazer teste no domínio de produção após CI e deploy READY.
