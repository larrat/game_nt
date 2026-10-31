# ADR-001 — Identidade visual Kurokage e convergência das propostas

**Estado:** proposta de decisão, para revisão; não é aprovação visual definitiva. **Data:** 31/10/2026.

## Contexto

- `docs/design/propostas-coletadas-2026-10-30/README.md` na master registra que o usuário escolheu o conceito **Quartel ninja** entre três estudos HTML.
- O roadmap UX v2 definiu cores de carvão, papel envelhecido, dourado controlado e vermelho-selo, com `Shippori Mincho`, `Inter` e `JetBrains Mono`.
- A PR #68 traz uma versão mais cinematográfica de Login, Seleção, Dashboard e Status, mas o protótipo sem login usa dados explicitamente fictícios. Ainda não existe homologação autenticada.
- O objetivo é um RPG original moderno, não uma réplica de assets, CSS, branding ou narrativa de Naruto Game.

## Recomendação para conciliar

**Estrutura funcional Quartel Ninja por dentro; atmosfera cinematográfica apenas nas telas de entrada e nos heros.**

- **Login / onboarding:** apresentação narrativa forte, uma ação principal, formulário com estados claros, pouca densidade.
- **Dashboard:** painel tático funcional, métricas verificáveis, progresso e atalhos; menos altura ocupada por arte, mais espaço para ação.
- **Seleção de personagem:** retrato protagonista, nivel/rank/vila, recursos e controles de 0–3 personagens.
- **Status / Academia / Missões:** layout denso em cartões/lists, requisitos, estado de bloqueio, duração, custo e resultado.
- **Combate:** tela em três blocos (combatentes e barras → turnos e log → habilidades e custos), responsiva, renderização após confirmação do servidor.
- **Vila / mapa:** vista contextual com destinos e requisitos; conteúdo legível em mobile.

## Design tokens propostos

| Categoria | Definição |
|---|---|
| Base | Carvão quente `#0B1018` e superfície elevada `#18222C` |
| Texto | Papel claro `#F1E9DC`; texto secundário `#B8B1A8` |
| Ação | Vermelho selo `#C93443` para ação principal e estados de perigo explicitamente distintos |
| Destaque | Ouro envelhecido `#E1B750`, usado com parcimônia |
| Vida/Chakra/Stamina/XP | Cores semânticas específicas e rótulo numérico obrigatório |
| Espaço | Multiplicadores de 4px (4, 8, 12, 16, 24, 32, 48) |
| Raios | 6/10/16px; favoráveis a alvos de toque `44px` ou maiores |
| Fontes | Shippori (título), Inter (interface), JetBrains Mono (valores) |

Os valores são **proposta**, não exigência para substituir imediatamente os tokens existentes da PR #68.

## Problemas a resolver antes de merge

1. A PR #68 introduz nova folha `experience-v2.css` além de `main.css`, `rpg-shell.css` e `design-foundations-v2.css`; deve convergir para um sistema de tokens/componentes ao invés de acumular exceções.
2. Os novos fundos devem ser conferidos contra os nomes reais dos assets; qualquer caminho inexistente precisa de fallback local autorizado.
3. Testes de contraste, responsividade, teclado, estados vazios/erro/carregamento e `prefers-reduced-motion` em **320, 390, 768 e 1440px**.
4. Não usar arquivos de referência coletados do Naruto Game no aplicativo público sem autorização/licença suficiente; preferir imagens originais do Kurokage.
5. Capturas visuais autenticadas de jogo com 0, 1 e 3 personagens, recursos baixos/zerados, missão em andamento e combate finalizado.
6. Remover qualquer texto fictício que pareça progresso real fora da rota de demonstração.

## Critério para aprovar o ADR

Conjunto mínimo de capturas das cinco zonas: Login, Seleção, Dashboard, Status e Combate, no desktop e celular; verificação de que o quartel visual favorece a operação; rejeição de dados inventados; revisão de visual próprio e consistência entre as rotas.

## Alternativas descartadas provisoriamente

- Recriar pixels do Naruto Game: referência funcional é insuficiente e licenciamento é incerto.
- Reescrever todas as telas de uma vez: risco de regressões, CSS cumulativo e falta de E2E.
- Migrar imediatamente para Phaser: custo e desempenho não justificados sem estabilidade do jogo.
