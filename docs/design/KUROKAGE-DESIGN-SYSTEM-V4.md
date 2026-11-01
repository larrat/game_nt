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
- **Demais telas:** recebem os aliases de tema, geometria/foco e estados globais nos botões existentes sem troca de lógica. A migração de marcação para `GameAction` e `GamePanel` será progressiva por tela, priorizando Status, Mapa, Combate, Missões, Academia e Inventário.

## Regras de qualidade
1. Não adicionar pacote pago, credenciais, chamadas a serviço externo ou lógica de combate no UI kit.
2. Todo botão deve ter feedback de hover, foco visível, disabled e alvo de toque de no mínimo 44 px salvo controles compactos justificados.
3. Nova tela deve ser avaliada a 320, 390, 768 e 1440 px; focos de teclado, contraste, imagens indisponíveis e `prefers-reduced-motion`.
4. Executar `npm test`, `npm run build` no CI e conferir a prévia correspondente ao **commit** antes de declarar homologada.
5. Alterações no motor de combate, no Supabase ou na política de recompensas são trabalho separado, com validação no servidor.

## Estado e limite
A instalação do design system na aplicação é automática, mas **não significa que cada página já foi completamente redesenhada**. As telas migradas neste pacote são Dojo e atalhos/KPIs do Painel. Uma sessão autenticada continua necessária para homologação visual.
