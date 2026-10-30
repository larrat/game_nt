# Academia de Jutsus 2.0 — 30/10/2026

## Fonte de verdade
O catálogo é consultado na tabela `public.jutsus`; o personagem contém `class`, `clan`, `element`, `rank`, `level`, `selo`, atributos e `ryous`. As operações usam as funções `aprender_jutsu` e `aprender_jutsus_massa` existentes no Supabase.

A função individual já verifica autenticação/propriedade, requisitos de nível, rank, classe exata (`req_class`, se preenchida), selo, domínio do atributo por categoria, clã, elemento, duplicação e custo do catálogo. A função em massa chama a função individual para cada jutsu e usa transação única. O frontend não é segurança; as regras autoritativas permanecem no Supabase.

## Implementado
- Catálogo dinâmico com filtros Todos, categorias efetivas (inclusive **Fuinjutsu**) e Elementares; técnicas de elementos incompatíveis são visíveis, mas não podem ser compradas.
- Cartões exibem requisitos legíveis por mouse, toque e teclado, sem depender de tooltip em hover.
- Uma função de elegibilidade compartilhada no frontend alimenta cartões, compra individual e seleção VIP.
- Custos de compra individual e total VIP são apresentados a partir da resposta do servidor. A compra em massa requer confirmação explícita e limite de 50 jutsus por operação.
- Feedback de carregamento e falhas, pesquisa pelo nome e estados vazios; proteção contra cliques simultâneos.
- Identificadores de jutsu normalizados para comparar jutsus já aprendidos.
- Testes unitários da verificação de requisitos, filtros, custos, clãs, elementos e lote VIP.

## Limites intencionais
- A PR #34 documenta multiplicador de atributos para classe fora da afinidade no Naruto Game, mas **nenhum jutsu do catálogo atual do Kurokage possui `req_class` preenchido**. Não foi introduzido o dobro de requisitos, nem alteradas as fórmulas ou o balanceamento.
- A tabela `jutsus` atual não possui `req_stats`; o frontend avalia os mesmos campos que a RPC. Fuinjutsu usa `ninjutsu` como domínio, reproduzindo o `ELSE` do SQL vigente.
- A regra de cálculo é uma pré-verificação do frontend; o resultado final é sempre decidido no banco, com mensagens de erro da RPC quando divergir.
- **Dívida técnica identificada:** a RPC atual reconhece `sannin` e `herói` para graduações, mas pode não reconhecer os títulos persistidos `Sannin Lendário` e `Herói Mundial` nas verificações de rank. Corrigir a normalização SQL com migração e testes específicos antes de alterações econômicas.
- Não foram alterados dados existentes, migrações, políticas RLS, permissões ou catálogo em produção.

## Critérios de validação
1. Logar com personagem nível 1, abrir academia e ver jutsus de Estudante que atendam a selos/ryous.
2. Consultar Fuinjutsu, Elementares e um jutsu bloqueado por clã/elemento sem conseguir comprá-lo.
3. Confirmar aprendizado com personagem de teste; recarregar e conferir saldo e novo jutsu.
4. Em conta VIP de teste, validar confirmação, limite 50 e custo confirmado pela RPC.
5. Executar `npm test` e `npm run build`; conferir deploy Preview e Production READY.
