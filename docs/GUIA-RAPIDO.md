# 🚀 Guia rápido — Kurokage

> **Para desenvolvedores e colaboradores.** Se a intenção é apenas conhecer o jogo, abra o [ambiente hospedado na Vercel](https://game-nt-larrats-projects.vercel.app). O serviço depende do estado de publicação e da configuração de autenticação.

## 1. Preparar o ambiente

**Requisitos:** Node.js **22 ou superior**, npm e um projeto Supabase com o esquema do GAME_NT já configurado.

```bash
git clone https://github.com/larrat/game_nt.git
cd game_nt
npm ci
cp .env.example .env
```

Abra `.env` e informe apenas os valores públicos do seu projeto:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICAVEL
```

A URL e a chave publicável ficam no painel do Supabase. Não coloque chaves `service_role`/secret, senhas de banco ou credenciais pessoais em `VITE_...` ou no GitHub: o Vite expõe essas variáveis no bundle do navegador.

**Importante:** conectar o frontend não instala automaticamente as tabelas, RPCs, permissões RLS ou os dados do catálogo. O banco precisa estar preparado conforme as [migrations do projeto](../migrations/) e os procedimentos revisados de implantação. Não execute todas as migrations cegamente em um banco existente.

## 2. Executar e testar

```bash
npm run dev
```

Abra http://localhost:5173. Para validar antes de uma PR:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

| Comando opcional | Quando usar |
| :--- | :--- |
| `node scripts/validate-reference-catalog.mjs` | Conferir referências de personagens e variantes |
| `node scripts/run-class-balance.mjs --samples=500 --level=10` | Comparar builds em simulação local, **não** equivalente ao combate SQL |
| `node scripts/prepare-character-art.mjs` | Pré-validar o manifesto de artes sem publicar arquivos |
| `npm run qa:staging` | **Somente** em um ambiente Supabase separado, com dois usuários descartáveis e variáveis de autorização explícitas |

Os testes locais não garantem autenticação, SMTP ou toda a jornada de gameplay. Consulte a [matriz de homologação](qa/JORNADA-CRITICA-2026-10-31.md).

## 3. Configurar autenticação do Supabase

No painel, vá a **Authentication → URL Configuration**.

| Campo | Valor de referência |
| :--- | :--- |
| Site URL | `https://game-nt-larrats-projects.vercel.app` |
| Redirect URL para confirmação/seleção | `https://game-nt-larrats-projects.vercel.app/selecionar` |
| Redirect URL para reset de senha | `https://game-nt-larrats-projects.vercel.app/redefinir-senha` |
| Desenvolvimento local | `http://localhost:5173/**` apenas para desenvolvimento |

Esses endereços correspondem ao domínio associado ao projeto Vercel no levantamento de **03/11/2026**. **Confirme o domínio vigente em Project Settings → Domains antes de alterar o Auth.** Uma instalação em domínio próprio deve substituir os endereços acima pelos respectivos URLs autorizados. Para previews, permita apenas endereços controlados pela equipe.

Revise também os templates e o provedor de e-mail e teste o ciclo completo: cadastro → confirmação → login → recuperação → redefinição de senha. Um link de recuperação não deve ser tratado como autorização automática de progresso no jogo.

Documentação oficial: [Redirect URLs do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

## 4. Publicar na Vercel

A aplicação usa **Vite** e está conectada à branch de produção `master`.

1. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente apropriado do projeto, sem copiar arquivos `.env` para o repositório.
2. Confirme o build `npm run build`.
3. Verifique o status `READY` do deployment e se as rotas `/login`, `/selecionar`, `/dashboard` e `/redefinir-senha` abrem corretamente.
4. Execute a jornada autenticada e teste tanto desktop como mobile. **`READY` apenas atesta que a publicação foi construída**, não que as regras de jogo estejam homologadas.

O [`vercel.json`](../vercel.json) já contém o rewrite necessário às rotas SPA.

## 5. Segurança antes de qualquer mudança

- Fluxos de XP, dano, itens, Ryous, Chakra, stamina e créditos precisam de validação **no servidor**.
- Uma conta não pode consultar ou modificar a ficha privada de outra; revise ownership, RLS, grants e RPCs privilegiadas.
- Migrations de banco precisam de preflight, staging, backup/reversão e verificação, principalmente quando alteram dados existentes.
- Raids verificadas e reset VIP possuem flags do servidor; **não habilite** sem testes de economia, replay, autoria e jornada E2E.
- Não promova imagens do diretório de pesquisa sem registro de proveniência e direitos de uso.

## 6. Onde continuar

[**Estado atual**](STATUS-DO-PROJETO.md) · [**Documentação por área**](README.md) · [**Design System**](design/KUROKAGE-DESIGN-SYSTEM-V4.md) · [**Código-fonte**](../src/) · [**Abrir issue**](https://github.com/larrat/game_nt/issues).
