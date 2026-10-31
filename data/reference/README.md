# Catálogos de referência

`observed-ninja-catalog.json` reúne 700 técnicas, 40 clãs e 767 versões, com requisitos AND/OR preservados e contexto de observação. Não ativa técnicas no combate nem define efeitos exclusivos ainda não validados. Execute `node scripts/build_observed_catalog.mjs` na raiz para reconstruir.

`initial-characters.json` contém 184 novas definições e 191 avatares iniciais derivados do selo Inicial do Templo. O seed SQL foi aplicado no projeto game_nt e repetido para verificar idempotência: 188 personagens e 222 avatares no total. Os quatro personagens e 31 avatares anteriores foram preservados; nenhum jogador foi alterado. Imagens usam URLs observadas; nem todos os retratos estão armazenados localmente.

O seed `scripts/seed_initial_reference_characters.sql` insere apenas registros ausentes, sem updates ou deletes. Técnicas continuam como referência porque o schema atual não representa todos os custos e requisitos compostos.
