# Kurokage · Inventário de imagens por personagem (03/11/2026)

**Etapa 1 do [redesign do primeiro acesso](../design/KUROKAGE-PRIMEIRO-ACESSO-ESCOPO-2026-11-03.md).**
**Estado:** auditoria de referência e integridade em branch; **não** migra imagens, não concede direitos de publicação e não atualiza o banco.

## Fonte comprovada

O arquivo `data/audits/character-asset-snapshot-2026-11-03.json` foi exportado **somente leitura** de:
- `public.characters`: `id`, `name`, `base_avatar_url`
- `public.avatars`: `id`, `name`, `character_id`, `is_base`, `evolution_target_id`, `evolution_req_level`

**Nenhuma ficha, e-mail, saldo, credencial ou dado de jogador foi exportado.**

### Números apurados

| Visão | Total | Local em `public/` | Fonte externa |
| --- | ---: | ---: | ---: |
| Personagens (`base_avatar_url`) **antes** do fallback local | 188 | 4 | 184 |
| Avatares (`avatars.id`) **antes** do fallback local | 222 | 31 | 191 |
| Retratos-base após resolver as três cópias exatas já incorporadas | 188 | **7** | **181** |
| Avatares após o mesmo fallback local (imagem de exibição) | 222 | **34** | **188** |

As três cópias aprovadas por correspondência *de bytes* são Hinata (`69-13.png`), Hiruzen (`110-2.png`) e Juzo (`262-3.png`).
Todos os outros retratos externos continuam remotos até obtenção e revisão dos arquivos exatos.

`public/images/avatares/` tem as 28 imagens do Sasuke usadas por `avatars` no SQL; Naruto, Sakura e Kakashi têm uma base local cada. O Madara usa `profile/122/16.png` externamente; uma imagem com nome parecido não substitui o mesmo retrato.

## Auditoria reproduzível

```bash
npm ci
node scripts/audit-character-asset-coverage.mjs
node scripts/audit-character-asset-coverage.mjs --json
npm test
```

O auditor:
- confere que imagens locais de `avatars` e `characters` existem em `public/images`;
- identifica remapeamentos de URLs externas **somente** quando foram manualmente comprovados;
- compara por SHA-256 cada uma das três cópias locais com seu arquivo exato no acervo de referência;
- relata tamanho e dimensões reais com `sharp` (lado menor que 512px recebe aviso, não upscale);
- acusa `evolution_target_id` inválido, avatar sem personagem, IDs repetidos e caminhos inseguros;
- lista personagens ainda dependentes de URL externa, sem fazer requests HTTP nem qualquer mudança SQL.

O snapshot fica datado. **Não substituir por suposição** se o banco mudar; executar uma nova coleta de leitura, criar snapshot datado e comparar o diff.

## Plano da próxima entrega: integrar a biblioteca sem quebrar jogadores

1. Conferir os arquivos públicos disponíveis e a autorização de uso; classificar cada retrato como `local_confirmado`, `fonte_externa`, `falta_original` ou `revisar`.
2. Organizar arquivos aprovados por personagem/versão, criar miniaturas quando necessário e não ampliar imagens de baixa resolução.
3. Criar vínculo aditivo de visualização (`source avatar ID → asset local path`) que não altere `avatars.id`. Esse campo hoje é chave primária e serve de identificador em perfis existentes.
4. Atualizar somente a camada de leitura `CharacterPortrait` e as telas, testando personagens antigos e novos. Jamais misturar variantes apenas porque o nome do personagem coincide.
5. Fazer prévia completa, comparação visual, teste de propriedade e ambiente staging. Produção só com plano de reversão.

**Resultado desta entrega:** diagnóstico automatizado e auditável; o backlog das **181 imagens-base ainda remotas** permanece aberto até as fontes exatas serem incorporadas. Não declarar cobertura local de 100% por causa do tamanho de `docs/reverse-engineering`.
