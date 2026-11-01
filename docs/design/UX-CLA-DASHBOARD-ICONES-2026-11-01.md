# UX — Clãs, Painel e HUD (revisão 01/11/2026)

## Evidência de referência disponível

A coleta autenticada de 30/10/2026 em `docs/reverse-engineering/coleta-2026-10-30/naruto-processos/README.md` registra, em Clãs: **carrossel, descrição do clã selecionado, alocação de atributos/fórmulas, saldo de pontos, ação de filiação e níveis de evolução**. O acervo contém 40 imagens de clãs, mas o banco Kurokage contém **19 registros**, com IDs distintos e nomes duplicados. A coleta é estrutural e não reproduz com precisão o estado visual pixel a pixel; não alegar equivalência perfeita.

## Decisões

1. **Seleção de clã inequívoca:** arte central grande, nome/descrição do clã selecionado; lista de todos os clãs em grade rolável com busca; seleção com destaque e `aria-pressed`; controles anterior/próximo e indicação de posição. Duplicatas recebem aviso e identificação pelo ID real para evitar filiação equivocada. Nunca colapsar IDs duplicados silenciosamente.
2. **Filiação separada da exploração:** configuração dos dez atributos e confirmação da escolha somente após seleção explícita; RPCs existentes e limite de 7 pontos permanecem inalterados.
3. **Painel e Status sem sobreposição:** `/dashboard` é central de operação (tarefas diárias, resgates, eventos, próximos passos); `/status` é ficha de personagem (retrato, evolução, 10 atributos, 13 derivados, poderes e conta). Retrato/HP/Chakra/Stamina/XP persistem na Top Bar, sem painel duplicado no Dashboard.
4. **Ícones consistentes:** HP/Chakra/Stamina/XP em todos os lugares usam `src/utils/resourceIconRegistry.js`; manter símbolos antigos fora dos indicadores e adotar Lucide semanticamente para navegação e ações. Asset existente não significa HD: revisão de densidade continua.
5. **Validação:** desktop 1440 e tablet 768 e mobile 390/320; seleção de 19 clãs, nomes duplicados, clã já ativo, carregamento vazio, consistência entre imagens; testes, build e QA autenticado. Não alterar banco, stamina, técnica, dano nem recompensas.
