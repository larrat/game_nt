# Auditoria de retratos locais — 03/11/2026

## Contexto
- O catálogo de produção contém 188 personagens e 222 avatares.
- Quatro personagens antigos usam caminhos locais em `public/images`.
- Os 184 personagens adicionados no catálogo inicial usam URLs HTTPS externas.
- A coleção documental `docs/reverse-engineering/coleta-2026-10-30/personagens-catalogo/imagens` contém 711 arquivos (cerca de 226,4 MB), mas apenas 3 URLs do catálogo inicial correspondem a arquivos com mesma origem e variante.
- `public/images` possui 980 entradas, e `public/images/avatares` 28; isso **não** significa que haja 188 retratos de personagens publicados.

## Primeira migração segura
A cópia dos três retratos documentados foi promovida para `public/images/characters/`, mantendo os blobs de origem existentes no Git:

| Personagem | Fonte original | Publicação local |
|---|---|---|
| Hinata Hyuuga | `profile/69/13.png` | `/images/characters/69-13.png` |
| Hiruzen Sarutobi | `profile/110/2.png` | `/images/characters/110-2.png` |
| Juzo Biwa | `profile/262/3.png` | `/images/characters/262-3.png` |

A correspondência também está registrada em `data/reference/initial-characters.json`.

O componente `CharacterPortrait` usa `resolveLocalCharacterPortrait` em tempo de renderização. Os IDs de `public.avatars`, o avatar salvo em `public.players` e `characters.base_avatar_url` **não** são alterados. Se a cópia local não carregar, o navegador tenta a URL original, antes do fallback visual.

## Pendências e limites
- **181 dos 184 retratos externos continuam sem um arquivo local correspondente comprovado** na coleção documental.
- O avatar `profile/122/16.png` usado por um personagem já cadastrado também não tem cópia de mesmo caminho nessa coleção; outros arquivos do mesmo personagem, com outra variante, não são substitutos válidos.
- Não converter `imgi_122_1.png` nem outros arquivos com números semelhantes em retratos apenas pelo nome; `imgi_*` é um conjunto misto de imagens de UI e outras mídias.
- Importar todos os 711 arquivos de uma vez acrescentaria aproximadamente 226 MB à pasta pública sem resolver a maioria dos personagens atuais.
- Para migrar os demais, obter as fontes correspondentes, conferir identidade e variante, dimensões reais, licença informada pelo responsável, tamanho e adequação ao painel. Adicionar apenas os arquivos verificados à lista local.

## Verificação
- `npm test && npm run lint && npm run build` no CI.
- Conferir os três retratos em criação, seleção, barra lateral, Dashboard e Status.
- Confirmar que perfis não mapeados continuam carregando pela URL original e que avatares já existentes não mudaram.
- A melhoria de resolução real depende de fontes de maior dimensão; o resolvedor não faz upscaling ou geração.
