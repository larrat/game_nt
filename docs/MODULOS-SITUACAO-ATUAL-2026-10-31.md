# Inventário dos módulos — código × documentação × QA

**Data:** 31/10/2026. Extraído do menu `src/utils/screenNavigation.js`, das 30 páginas JSX da `master` e das notas de implementação. **Importante:** presença de tela/rota não equivale a fluxo validado em produção.

| Área | Rotas existentes | Evidência de implementação | Falta para homologação |
|---|---|---|---|
| Conta | `/login`, `/redefinir-senha`, `/criar`, `/selecionar` | Auth Supabase, validação de criação/exclusão, mensagens de erro; UI v2 na PR #68 | SMTP, callback real, 0–3 personagens, exclusão irreversível e controles A/B |
| Painel | `/dashboard` | Recursos e recompensas via RPC, estrutura de cards e eventos; UI v2 na PR #68 | Visual real mobile/desktop, saldo/XP confiáveis, estados de falha |
| Identidade | `/status` | 10 atributos, 13 derivados, 14 métricas de histórico, avatar, título; UI v2 na PR #68 | Comparar SQL/engine, status com recursos 0, mudança de avatar, dados nulos |
| Equipamento | `/equipamentos` | Equipar, vender itens por RPC com privilégios do servidor | Compra/venda favoritado/equipado, recusa/rollback, inventário A/B |
| Clãs e elementos | `/clas`, `/elementos` | RPCs de adesão, treino de clã e aprendizado de elemento | Exclusividade, pré-requisitos e efeitos duráveis entre sessões |
| Invocações | `/invocacoes` | Assinar pacto e equipar via RPC | Requisitos, recuperação, acúmulo, combate e reset |
| Academia | `/treino`, `/tecnicas`, `/aprimorar-jutsus` | Academia v3, simulação/recibo, custos e requisitos de catálogo, aprimoramentos | Fluxo de compra, concorrência, clã, custo, saldo e lote VIP |
| Missões e graduação | `/tarefas`, `/graduacoes`, `/exame` | Temporizadores, RPCs de missão e promoção, proteção de replay da migration 060 | Finalização única, prazo real, XP e Rank persistentes, requisitos combinados |
| Combates | `/dojo` e tela de combate acionada pelos módulos | Sessões de PvE, turnos e liquidação pelo banco; `combat-v3.css` | Ações 0/1/N, cooldown, replay, usuário B, persistência e log extenso |
| Jornada | `/mapa`, `/historia`, `/evento`, `/historico` | Viagem, história e boss integrados a RPCs | Resultados de eventos, rounds, limites, recompensas e exclusividade |
| Competição | `/ranking` | `listar_perfis_ninja` e `listar_lideres_vila`; dependência da migração 063 | Exibição após restrição de SELECT da 064, filtros e paginação |
| Vila e serviços | `/vila`, `/hospital`, `/ferreiro`, `/ichiraku`, `/portoes`, `/templo` | RPCs para habitantes/líderes, cura, refino, ramen, portões e avatares | Consumíveis e recuperação reais, favoritos, acesso e upgrades |
| Premium | `/vip` | Reset de talentos/personagem e compra VIP de jutsus por RPC | Fluxos de pré-visualização/confirmação, regras e pagamento se houver |

## Observações de auditoria

- Somente em páginas JSX, as leituras diretas da tabela `players` foram encontradas em `App.jsx`, `Selecionar.jsx`, `Criar.jsx` e `Exame.jsx`. Os demais módulos examinados usam consultas de outras tabelas/RPCs. Essa contagem de código **não** comprova que não existam leitores em integrações externas, scripts ou funções SQL.
- `Ranking`, `Vila`, `Mapa`, `Criar` e `Dojo` possuem consumidores das APIs públicas introduzidas na migração 063. Testar em ambiente controlado antes da policy 064 owner-only.
- 700 técnicas estruturadas são referência; banco contém 57 jutsus registrados. Não alterar o esquema de produção simplesmente para importar o catálogo observado.
- Os blocos de Academia, Combate e Status já receberam implementações v3 em código. O próximo ciclo é de integração, QA e padronização, não de começar de novo.
- A comparação com Naruto Game deriva de observações limitadas por personagem/nível; registrar as regras **originais do Kurokage** separadamente.
- Nenhum bloco é classificado como **homologado** nesta tabela: a documentação não comprova a execução do teste completo autenticado com usuários descartáveis.

## A primeira release que vale encerrar

A release piloto deve demonstrar sem regressões: criar conta e personagem, selecionar, visualizar Status, treinar, aprender uma técnica, iniciar/finalizar uma missão, vencer um PvE, receber progresso uma vez, abrir Graduações e reiniciar sessão preservando estado.

Tudo o que não serve a esse percurso pode ser planejado separadamente, depois das correções de privacidade e autenticação.
