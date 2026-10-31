# Catálogo de personagens e imagens

Coleta: 30/10/2026, pela interface autenticada de https://narutogame.com.br.

- 239 nomes distintos no Templo Ninja, preservando a grafia do site; não equivale a 239 identidades canônicas normalizadas.
- 767 versões expostas com filtro Todos; todas as 767 galerias inspecionadas.
- 5.369 referências nas galerias; 6.128 URLs únicas ao cruzar galerias, temas VIP e prévias 4×4.
- 711 mídias baixadas localmente; as demais estão registradas por URL, não baixadas.
- Todos os 550 temas VIP foram baixados, incluindo WebM animados.
- Uma galeria vazia confirmada: Zetsu — Guruguru, versão 465. Sua prévia 4×4 está registrada.
- O filtro VIP lista 230 nomes; o Templo é mais abrangente.

## Arquivos

Abra index.html para buscar personagens e expandir versões. catalogo.json contém todos os registros; imagens.csv e versoes.csv facilitam importação. nomes.txt lista nomes do Templo. personagens.json preserva o filtro VIP original. verificacao.json registra as verificações locais.

Cada mídia informa personagem, versão, ID, tipo, origem, fontes e arquivo local quando existente. Deduplicação por caminho da URL, normalizando barras duplicadas e porta HTTPS padrão; não por comparação visual ou hash de conteúdo. Não foi feita fusão automática de grafias como Juugo/Jugo ou Gai/Maito Gai.

## Cobertura e limites

Este registro cobre as galerias de retratos expostas pelo Templo e a galeria de Temas VIP nesta sessão. Não afirma reunir arquivos privados, removidos, não expostos, versões futuras, todas as artes de combate, topos ou fundos. Imagens ainda remotas precisam ser baixadas para uso offline. Os erros de leitura das versões 423 e 465 foram revistos: 423 recuperada; 465 retornou corpo vazio. O arquivo erros-galerias.json conserva o histórico de tentativas, não pendências atuais.

A disponibilidade dos arquivos não concede licença de uso ou redistribuição das artes.
