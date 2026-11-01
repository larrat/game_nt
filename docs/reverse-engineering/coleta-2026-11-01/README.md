# Coleta de telas e arquivos — 01/11/2026

Retomada focada no acervo de referência para game_nt/Kurokage. Foram feitas navegações e leituras; não houve novos combates, treinamento, compras ou adesão a especializações. A seleção do personagem restabeleceu o acesso normal às telas.

## Entregas desta coleta

- **10 telas com exportação de recursos:** Status, Talentos, Equipamentos, Jutsus Medicinais, Kinjutsus, Jutsus de Karma, Invocações, Selos, sistema de Karma e Profissões.
- **287 URLs de arquivos estáticos**, correspondentes a **262 arquivos locais distintos por SHA-256**: 259 referências de imagem, 25 estilos e três fontes. Essas contagens são desta coleta; há sobreposição com os acervos anteriores. As 1.215 ocorrências de download terminaram sem falha.
- **19 jutsus adicionais:** cinco medicinais, quatro kinjutsus e dez de Karma; nomes, graduação, requisitos e todas as 19 imagens locais. Somados aos 700 anteriores, são **719 IDs distintos catalogados**.
- **32 tooltips de talentos**, oito estágios de Karma, 12 estágios de selo e 30 cartões de profissão. Os cartões preservam associação entre arquivo de ícone, valor e requisitos.
- Formulário de invocação com opções expostas no DOM. Nenhum pacto foi aceito.

Abra [a galeria pesquisável](assets-index.html) para visualizar as imagens e os ícones. O [manifesto](assets-manifest.json) associa URL original, tela, caminho local, tamanho e hash. Os recursos estão em `assets/`.

## Como interpretar os dados

Os jutsus desta coleta foram observados no contexto **Taijutsu**. Medicinais e kinjutsus usam um payload de tooltip entregue em atributo do DOM; foi decodificado apenas esse conteúdo de exibição, excluindo o payload de compartilhamento/chat. Alguns valores brutos diferem do texto de requisitos renderizado: os dois foram preservados, sem declarar que o payload é a regra autoritativa.

O suplemento estruturado está em `data/reference/supplemental-jutsus-2026-11-01.json`. As referências `localImage` apontam para arquivos relativos a esta pasta. O catálogo anterior mantém seu contexto Genjutsu e sua data; não misturar coeficientes entre classes nem ativar técnicas automaticamente no combate do projeto.

Em equipamentos, o estado capturado mostrou a tela e os controles de soma de atributos/histórico de drop; não representa um catálogo completo de equipamentos. Um botão presente no DOM não prova que sua ação está liberada para o personagem.

## Limites e pendências

Não há garantia de coleta de todo o site. Faltam estados de diálogos, abas e filtros, itens que não foram expostos pela sessão, estados de graduações superiores e downloads locais de grande parte das galerias antigas de personagens. A revisão de 76 rotas de 30/10 é histórica: seus bloqueios não devem ser usados como estado atual.

O acervo contém apenas material entregue ao navegador. Não foram obtidos PHP, banco de dados ou arquivos privados do servidor. Os arquivos de referência não são automaticamente servidos pela aplicação.

Capturas privadas, manifestos temporários com caminhos da máquina, publicidade, chat e identificador da conta ficaram fora deste pacote. A autoria das artes permanece com seus titulares; o manifesto registra origem, sem atribuir nova licença.
