# ADR-002 — Navegação e ícones consistentes do Kurokage

**Data:** 2026-10-31  
**Status:** implementação proposta em PR (não indica homologação visual).  
**Custo adicional:** nenhum; usa `lucide-react` já instalado, SVGs como componentes locais.

## Problema observado

`src/components/SidebarIcon.jsx` selecionava desenhos comparando labels textuais antigos.
O catálogo atual mudou `Ficha` → `Status do Ninja` e `Técnicas` → `Técnicas e Jutsus` e tinha destinos sem símbolo exclusivo. Uma caixa circular genérica era exibida como fallback em vários links.

A sidebar também exibia muitas categorias simultaneamente abertas, comprimindo o espaço de navegação no notebook e no mobile.

## Decisão

1. **Uma família de ícones:** Lucide, contorno, `strokeWidth={1.9}`, 18px para destinos, 16px para categorias e dimensões consistentes para ações rápidas. Sem emoji, imagens de terceiros, novos pacotes ou hospedagem externa.
2. **Vínculo estável:** `src/utils/screenNavigation.js` declara `icon` para cada grupo e destino. O componente `SidebarIcon` mapeia nomes semânticos aos componentes Lucide, sem depender de títulos traduzidos.
3. **Navegação compacta:** abre inicialmente o grupo da rota atual (e Central), em vez de manter três grupos sempre expandidos.
4. **Localização e busca:** `filterScreenNavigation(query)` suporta acentos, termos sem acento e busca pelo nome de um grupo. Durante a busca, as categorias encontradas são abertas automaticamente; o botão de expandir fica desabilitado até limpar o termo.
5. **Acesso rápido:** Painel, Treino e Missões; atalhos continuam sendo `NavLink` para preservar estado de rota ativa e acessibilidade.
6. **Feedback:** estado ativo com linha dourada/vermelha e ícone correspondente, hover discreto, foco visível, ícones decorativos `aria-hidden`, `aria-expanded`, `aria-controls`, `hidden` e `role=status` para ausência de resultados.
7. **Mobile:** drawer atual, busca e scrolling interno; não altera a API do `Sidebar` nem a lógica do jogo.

## Identidade visual

- Base: fundo azul-petróleo escuro do Quartel Ninja.
- Acento: dourado para hierarquia/categoria e estado ativo, selo vermelho na barra do item atual.
- Sem símbolos licenciados de Naruto e sem importações do catálogo de engenharia reversa.
- Evitar misturar 16 emojis, imagens raster e SVGs de espessuras diferentes no mesmo menu.

## Testes e validação

`tests/sidebarNavigationV3.test.js` verifica 6 categorias, 25 destinos, unicidade das rotas, ausência de ícones desconhecidos, busca acento-insensível, estrutura de navegação e pontos básicos de responsividade/acessibilidade.

Falta homologar visualmente com conta descartável em desktop e mobile e verificar menu de navegação com teclado. O teste estático e o build não substituem QA no navegador.

## Controle de custos

Esta PR não cria projetos, branches de banco, funções, provedores, serviços ou cobranças. Nenhuma migração Supabase e nenhuma alteração em dados reais. A migração RLS `064` permanece pendente até ser possível homologar sem custo.
