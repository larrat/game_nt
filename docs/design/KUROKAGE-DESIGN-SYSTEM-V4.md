# Kurokage UI Design System v4 — contrato de telas

**Vigência:** a partir da PR de padronização Kurokage v4. **Escopo:** experiência autenticada do RPG; tela de login/cadastro conserva a composição própria.

## Princípio
Não criar paletas, botões, cartões ou iconografias diferentes por página. Cada nova tela reutiliza **tokens de uma única fonte** e **componentes existentes**, mantendo a lógica e os RPCs no domínio da página.

## Fontes canônicas
- **Cores, espaçamentos, raio, foco e estados:** `src/styles/design-system-v4.css`, carregado em `src/App.jsx` após estilos legados. Os prefixos `--kuro-*` são canônicos; variáveis `--kui-*` e `--kx-*` recebem aliases para permitir migração progressiva.
- **Ícones:** `src/components/SidebarIcon.jsx`. Registro semântico de `lucide-react`; usar `<SidebarIcon name="swords" size={18} />`, não emojis em ações. Todos os ícones recebem o mesmo `strokeWidth` e são decorativos em navegação com nome visível.
- **Botões:** `src/components/ui/GameAction.jsx`: tons `seal` (primário), `quiet` (secundário), `gold` (destaque) e `danger` (ação perigosa); tamanhos default/small; `loading` e `disabled` integrados.
- **Painéis:** `src/components/ui/GamePanel.jsx` e classes `.kuro-ui-card` / `.kui-panel` para estrutura; título e subtítulo via `PageHeader`.
- **Recursos:** `ResourceMeter`, sem recriar indicadores de HP/Chakra/Stamina em cada página.
- **Metadados:** `.kuro-ui-label`, `.kuro-ui-muted`, `.kuro-ui-badge`.
- **Estilos por tela:** podem definir grid, imagens de fundo e composição, **não** novas cores e formatos de botão sem mudar o sistema compartilhado.

## Paleta
| Token | Valor | Uso |
| --- | --- | --- |
| `--kuro-bg` | `#080d14` | canvas |
| `--kuro-surface` | `#131c27` | card |
| `--kuro-surface-up` | `#1c2835` | card elevado |
| `--kuro-gold` | `#ebc17c` | navegação ativa, foco, acentos |
| `--kuro-red` | `#d64750` | ações de risco, destaque |
| `--kuro-copy` | `#f3ecdf` | texto |
| `--kuro-muted` | `#b9bbc0` | texto secundário |
| `--kuro-line` | `rgba(235,194,130,.20)` | borda |

## Aplicação
- **Dojo v4:** apresenta arena, métricas reais, modalidades, Raid e ações de risco. Usa ícones e botões compartilhados, preserva handler e chamada RPC existentes.
- **Painel:** KPI e atalhos deixam caracteres Unicode decorativos e passam a usar o mesmo registro de ícones. Inclui atalho ao Arquivo de Adversários.
- **Todas as telas declaradas em `src/App.jsx` (31 módulos):** `src/styles/shared-screen-v4.css` aplica `--kuro-*` ao tema global, tokens legados, cartões, controles, badges, filtros, estados de foco e responsividade. Inclui login/recuperação e criação/seleção de personagem sem alterar seus layouts cinematográficos.
- **Status v4:** ícones de poderes e linhagens via registro Lucide e painéis no mesmo padrão, mantendo fórmulas e RPC de título.
- **Arquivo de Adversários v4:** cores originadas no tema global, botões `GameAction` e ícones Lucide; continua estritamente de leitura, sem habilitar combate de catálogo/PvP ao vivo.
- **Demais telas:** recebem automaticamente tokens, geometria e estados globais. A migração **completa do layout** de cada módulo para `GameAction` e `GamePanel` é progressiva, priorizando Mapa, Combate, Missões, Academia, Inventário e sistemas secundários.

## Regras de qualidade
1. Não adicionar pacote pago, credenciais, chamadas a serviço externo ou lógica de combate no UI kit.
2. Todo botão deve ter feedback de hover, foco visível, disabled e alvo de toque de no mínimo 44 px salvo controles compactos justificados.
3. Nova tela deve ser avaliada a 320, 390, 768 e 1440 px; focos de teclado, contraste, imagens indisponíveis e `prefers-reduced-motion`.
4. Executar `npm test`, `npm run build` no CI e conferir a prévia correspondente ao **commit** antes de declarar homologada.
5. Alterações no motor de combate, no Supabase ou na política de recompensas são trabalho separado, com validação no servidor.

## Estado e limite
A camada comum chega às **31 telas** por meio de `App.jsx`, mas **isso não significa que cada página já foi completamente redesenhada ou homologada visualmente**. Migrações específicas concluídas: Dojo, atalhos/KPIs do Painel, Status e Arquivo de Adversários. Os outros módulos herdam o tema e aguardam revisão visual contextual. Uma sessão autenticada é necessária para homologar telas de jogo; login/recuperação exigem sua própria revisão sem autenticação.

### Inventário de rotas
- **Acesso/conta:** Login, RedefinirSenha, Selecionar, Criar.
- **Personagem e evolução:** Dashboard, Status, Treino, Elementos, Graduacoes, Tarefas, Tecnicas, AprimorarJutsus, Equipamentos.
- **Mundo e atividades:** Clas, Vila, Mapa, Historia, Templo, Hospital, Ichiraku, Ferreiro, Invocacoes, Portoes, Exame, Evento.
- **Batalha e progressão:** Dojo, Adversarios, Combate, Ranking, Historico, Vip.

### Checklist por tela (pendente após a base comum)
Verificar navegação real, consistência de botão principal/segundário, ícone Lucide, estados vazios/erro/carregamento, toque mobile, modais, imagens/fallback e contraste. A validação de contas reais não deve ser substituída por passar CI. Não modificar Supabase, fórmulas de motor ou recompensas para corrigir somente aparência.
