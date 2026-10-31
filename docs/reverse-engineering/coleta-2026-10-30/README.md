# Acervo coletado — Naruto Game

Coleta concluída em 30/10/2026; preparada para publicação em 31/10/2026. Material de referência para o game_nt/Kurokage.

## Catálogos para uso no projeto

- [Personagens](personagens-catalogo/README.md): 239 nomes distintos conforme a grafia do Templo, 767 versões e todas as 767 galerias verificadas. 6.128 referências únicas ao cruzar galerias, prévias e temas; 711 mídias locais, incluindo os 550 temas VIP. As demais são URLs, não downloads concluídos. Zetsu — Guruguru retornou galeria vazia.
- [Jutsus de clã](jutsus-catalogo/README.md): 320 registros de 40 clãs, com nome, graduação, requisitos e imagem local em todos os registros. Não cobre todas as outras categorias de jutsu.
- [Imagens de clãs](imagens-clas/manifest.json): 40 imagens do seletor e cinco assets adicionais de habilidades, com origem.
- [Catálogo pesquisável](personagens-catalogo/index.html): abrir o HTML localmente; CSV e JSON estão na mesma pasta.

## Processos e evidências

- [Validação funcional consolidada](validacao-funcional.md): treinamento, progressão até nível 5, duelo, atributos, graduação, clã e jutsus.
- [Processos e combate](naruto-processos/README.md), [relação clã/jutsus](naruto-processos/relacao-cla-jutsus.md) e [ícones do cabeçalho](naruto-processos/icones-cabecalho.json).
- [Estrutura e 76 rotas](naruto-estrutura/README.md) e [capturas textuais](naruto-capturas/README.md). Capturas históricas representam o estado daquele momento, não requisitos permanentes.
- [Propostas de layout](../../design/propostas-coletadas-2026-10-30/README.md), incluindo a opção Quartel ninja selecionada.

## Confiabilidade e privacidade

Os atributos do clã são personalizáveis; seletores amostrados não definem bônus fixos por clã. A identidade exclusiva vem da habilidade e de sua evolução. As associações entre clã e Nin/Gen/Tai/Buk ainda precisam de verificação específica. catalogos.json está marcado como provisório. As amostras originais estão em naruto-processos/historico-provisorio/; relacao-cla-jutsus.json foi corrigido com os oito cartões Hyuuga validados. Para importação, prefira o catálogo completo posterior de 320 jutsus.

Foram removidos identificadores da conta, chat, e-mails, caminhos locais e referências de publicidade quando presentes nos textos. Capturas de tela da sessão e respostas dinâmicas não revisadas permanecem localmente; estão listadas no [manifesto de publicação](publicacao.json). ZIPs locais não são duplicados no Git: o conteúdo revisado está em arquivos individuais.

Não houve recuperação de código PHP ou banco do site. A validação funcional não é de 100% dos sistemas. Arquivos coletados mantêm a autoria original; sua presença aqui não atribui licença de reutilização. Este acervo não é servido automaticamente pela aplicação.
