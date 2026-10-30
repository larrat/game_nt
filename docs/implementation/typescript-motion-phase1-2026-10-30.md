# Modernização técnica — Fase 1 (30/10/2026)

## Objetivo
Introduzir TypeScript e um padrão de transições na seleção de personagens do Kurokage **sem migrar todo o React, alterar a economia ou modificar o Supabase**.

## Entrega
- `src/utils/characterPresentation.ts` é o primeiro módulo TypeScript tipado: define `CharacterSelectionRecord`, `CharacterResource`, `ResourceMaximums` e os cálculos **de apresentação** de Vida, Chakra e Stamina.
- `src/pages/Selecionar.jsx` usa o módulo tipado. Diferentemente da tela anterior, barras de recursos não assumem que todos os personagens estão com Vida/Chakra/Stamina cheios: `0` aparece como `0`, e valores nulos têm fallback de exibição para o máximo calculado pelo motor atual.
- `src/styles/character-selection.css` traz um layout de escolha do personagem com entrada animada, cartões, ajuste mobile e `prefers-reduced-motion: reduce`.
- A configuração do compilador fica centralizada na PR #43 de TypeScript/Motion, evitando uma segunda definição de `tsconfig.json`.
- `tests/characterPresentation.test.js` exercita o utilitário TypeScript (strip types nativo do Node 22) com recursos baixos, superiores ao máximo, nulos e moeda negativa.

## Limites e dependências
O Vite já transpila arquivos `.ts` nativamente; **esta PR não declara que o projeto inteiro foi tipado**. A instalação do compilador e o `tsconfig.json` serão integrados pela PR #43 **somente após a validação das dependências e do lockfile**.

Esta PR usa CSS nativo; a integração com **Motion for React** é tratada em paralelo pela PR #43, com atualização coordenada de `package.json` e `package-lock.json`. Nunca usar CDN em produção para contornar lockfile.

**Phaser** fica para um protótipo de combate isolado, posteriormente. Regras de custo, dano, XP e vitória permanecem autoritativas no banco.

## Como validar
1. Executar `npm ci && npm test && npm run build` no Node.js 22+.
2. Acessar `/selecionar` autenticado com mais de um personagem e testar setas e botões.
3. Confirmar que um personagem com Vida zero exibe 0 em vez de HP cheio.
4. Em tela estreita, revisar avatar, recursos, ações e ausência de cortes.
5. Simular `prefers-reduced-motion: reduce` e conferir que a entrada deixa de animar.
6. Testar `Jogar` e `Remover` **somente com personagem de teste** (remoção é irreversível).
