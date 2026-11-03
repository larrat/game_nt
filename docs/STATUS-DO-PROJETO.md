# 🧭 Estado do projeto — Kurokage

**Revisão:** 03/11/2026 · **Fonte:** repositório `larrat/game_nt`, histórico de PRs e verificações de leitura no Supabase/Vercel.

> [!NOTE]
> Este documento é uma **fotografia datada**, não um monitor em tempo real. Distinguimos *implementado*, *integrado à master*, *deploy construído*, *validado em CI* e *homologado em gameplay*.

## 📍 Em uma página

| Frente | Resultado observado | Próximo critério |
| :--- | :--- | :--- |
| **Arquitetura** | React 19, Vite 8, Tailwind 4, Motion, TypeScript incremental, Supabase/PostgreSQL, Vercel | Evolução incremental, sem reescrever a stack |
| **Personagens** | Criador V5, 4 classes e 10 pontos/10 atributos por classe; validação também no SQL | Jornada real e responsividade |
| **Privacidade** | Política `players` restringe a ficha ao proprietário | Repetir teste A/B com contas isoladas |
| **Combate/economia** | RPCs e testes sintéticos; simulador offline de classes | Paridade cliente/SQL, E2E e replay |
| **Catálogo** | 188 personagens, 222 avatares, 57 jutsus e 15 NPCs no banco (snapshot) | Expansão por lotes com requisitos e revisão |
| **Retratos** | PR de fallback local para 3 cópias identificadas; pipeline de artes aprovadas | Localizar e validar as fontes exatas restantes |
| **Raids / reset VIP** | Rotinas e testes sintéticos; flags estavam `false` na leitura de 03/11 | Staging separado e homologação de débito/recompensa |
| **UX** | Design System v4, V5 da criação e busca na mochila | QA visual e funcional de cada tela |

## ✅ Entregas recentes integradas

| PR | Mudança | Evidência |
| :--- | :--- | :--- |
| [#117](https://github.com/larrat/game_nt/pull/117) | Retratos: 3 cópias locais verificadas, fallback remoto e testes | Integrada à master |
| [#118](https://github.com/larrat/game_nt/pull/118) | QA: avatar inicial e treino sem pontos disponíveis | Integrada; CI validado |
| [#119](https://github.com/larrat/game_nt/pull/119) | Pipeline de artes com aprovação documentada | Integrada; CI validado |
| [#120](https://github.com/larrat/game_nt/pull/120) | Simulação offline e reprodutível das 4 classes | Integrada; CI validado |
| [#121](https://github.com/larrat/game_nt/pull/121) | Mochila: busca, contagem e proteção de consumo simultâneo | Integrada à master |
| [#122](https://github.com/larrat/game_nt/pull/122) | Validação do catálogo de referência e auditoria SQL | Integrada; CI validado |
| [#123](https://github.com/larrat/game_nt/pull/123) | Testes SQL de economia/privacidade para Raid e VIP | Integrada; CI SQL validado |

**Importante:** CI verde e merge não comprovam que todas essas mudanças já foram testadas em conta real ou estão ativas no deployment de produção.

## 🔜 Prioridades

1. **Homologação completa** — autenticação por e-mail, seleção/criação, treino, missão, combate, recompensa única e persistência; duas contas isoladas para testar autorização.
2. **Retratos e variantes** — remover dependência de fontes externas somente após localizar a correspondência exata e conferir os direitos.
3. **Jutsus e conteúdo** — definir requisitos de classe, elemento, clã, graduação, custo, efeitos e progressão antes de ativar novos lotes.
4. **UI/UX** — testar a mochila, a criação de personagens e os fluxos críticos em telas pequenas e grandes.
5. **Raids e VIP** — manter desligados até testes positivos e negativos em staging, telemetria e aprovação específica de ativação.
6. **Segurança de RPCs** — auditar funções privilegiadas e configurações de autenticação continuamente.

## 🔎 Critérios de conclusão

Uma funcionalidade só deve ser anunciada como **homologada** quando houver resultado reproduzível no ambiente apropriado, teste de autorização, verificação de persistência e ausência de regressão visual/funcional relevante. Publicações em produção são verificadas separadamente.

[⬅ README principal](../README.md) · [Instalação](GUIA-RAPIDO.md) · [Matriz de QA](qa/JORNADA-CRITICA-2026-10-31.md) · [Matriz de módulos histórica](MODULOS-SITUACAO-ATUAL-2026-10-31.md).
