# Coleta de telas — 01/11/2026, lote 2

Referência observada em sessão autenticada, personagem nível 5. Sete rotas e nove capturas de estado; não representam a cobertura integral do jogo.

- Ninja Shop: 86 itens identificados por ID, inclusive variantes com nomes repetidos. Preços, requisitos renderizados, imagens e dados de tooltip expostos pelo DOM em ninja-shop-catalogo.json. Campos internos preservados sem atribuir significado não confirmado.
- Pacotes: 49 cartões, nomes, preços, limites e possíveis recompensas em pacotes-catalogo.json. Nenhum pacote comprado ou aberto. Contagens regressivas e disponibilidade são circunstanciais.
- Loja do Sensei: 20 marcos, de 1 a 150 desafios vencidos. A tela informa recompensas limitadas a uma compra por round. Não foi testado resgate.
- Sensei: 28 opções, com acesso livre, VIP, Ryous ou créditos conforme os botões. Nenhum vínculo contratado; desafios após a escolha seguem pendentes.
- Baú: duas ofertas, Hinata Lunar e Himawari Uzumaki — Time Skip; não é uma tela de inventário neste estado.
- Caçada Ninja: Ino — Halloween; requisito visível de 100 fragmentos e oferta de 10 fragmentos por 5 créditos. Sem desbloqueio ou compra.
- Reforja: seletor e categorias presentes, sem equipamento exposto na lista desta conta. Custos, rolagem e resultado ainda não validados.
- Equipamentos: Soma de atributos abriu diálogo com Taijutsu +0. Não expôs fórmulas completas. Histórico de Drop não apresentou resultado verificável.

## Arquivos e verificação

173 arquivos novos baixados, com SHA-256. O manifesto relaciona 287 URLs estáticas observadas, reutilizando arquivos do lote anterior por caminhos relativos quando aplicável. Nenhuma falha de download neste lote. A galeria assets-index.html funciona localmente e permite pesquisar pela origem ou tela.

IDs únicos nos catálogos (86 itens e 49 pacotes); imagens vinculadas a arquivos locais. JSONs e hashes verificados. Não foram coletados código PHP, banco de dados ou lógica privada do servidor. Tooltips evidenciam dados entregues ao navegador, não confirmam fórmulas reais de combate. Payloads de compartilhamento/chat, credenciais e identificador da conta foram excluídos.

## Pendências

Compra, equipamento e uso de cada item; abertura e probabilidades reais dos pacotes; escolha e desafios dos senseis; resgates e desbloqueios; reforja com equipamento elegível; resultado do Histórico de Drop. Não marcar esses fluxos como testados.
