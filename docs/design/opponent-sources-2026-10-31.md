# Sistema universal de adversários — Kurokage

## Objetivo
Permitir que qualquer entrada do catálogo de **188 personagens** e qualquer jogador elegível com **perfil público** possa aparecer como adversário do mundo ninja. Um NPC **não é uma tabela nova de pessoas**: é uma apresentação de uma das fontes abaixo.

| Fonte | Origem | Exemplo | Combate |
| --- | --- | --- | --- |
| NPC persistente | `public.npcs` | Naruto no Mapa ou NPC de missão | Continua usando sessão/validação existentes |
| Personagem do catálogo | `public.characters` | Um dos 188 personagens; várias versões | **Representação pronta**, luta só depois de regras/sessão autorizativas |
| Projeção de jogador | RPC `listar_perfis_ninja` | Sombra de um jogador público | Já aparece no Mapa com combate temporário sem recompensa; **não é PvP ao vivo** |

### Separação de identidades

Usar `opponent_origin` para distinguir `npc`, `catalog_character` e `player_shadow`. `npcs.id` é inteiro, `characters.id` é texto, e a sombra tem chave visual `ghost_<id>`. **Não cruzar tabelas por ID coincidente e não usar nome como chave global.**

Um personagem do catálogo pode compartilhar nome com um jogador; na projeção do jogador, prevalece o retrato de seu próprio perfil público, nunca a imagem licenciada do personagem de mesmo nome.

### Privacidade e progressão

- `listar_perfis_ninja` exige login e devolve somente `id, name, class, level, xp, village_id, rank, avatar, element`. O adaptador de sombras usa apenas o subconjunto necessário para UI/combate temporário. Não usar consulta aberta à tabela `players`.
- A consulta de 31/10/2026 encontrou **2 jogadores cadastrados**. O Mapa hoje consulta até 100 perfis ordenados por posição; se a base ultrapassar 100 jogadores, ampliar a descoberta por endpoint paginado/seleção autorizada e opcionalidade de aparecer como projeção.
- `listar_rivais_dojo` exige que o personagem solicitante pertença ao usuário e seleciona rivais elegíveis da vila, expondo atributos de combate necessários. **Não usá-lo como API pública universal sem revisar consentimento e autorização**.
- A função `createCatalogOpponent` cria **somente o registro visual** com `combat_ready: false`. Não iniciar combate real ou pagar prêmios com o cadastro sozinho. O servidor deverá validar personagem, estatísticas, técnicas, dificuldade, regras de desbloqueio e recompensas.
- A função `createPlayerShadow` aproveita apenas campos públicos; a batalha temporária do Mapa continua sem recompensas, como já impõe o combate sem sessão validada. Não copiar inventário, créditos, e-mail ou dados privados do jogador.
- Perfis cadastrados podem usar avatar apontando para imagem externa; não fazer hotlink na UI sem origem autorizada. Reutilizar arte local permitida ou fallback.

### Implementado na PR #77
1. Resolvedor de imagens de NPCs fixos e de renegados genéricos.
2. Mapa/Radar usam o mesmo componente visual, com texto alternativo e fallback.
3. Adaptadores separados para entidades de catálogo e para projeções públicas de jogadores.
4. Testes que protegem colisão de nomes, URLs externas e ausência de campos privados.
5. Nenhuma alteração de SQL, RLS, cobranças, tabela de jogadores ou lógica de recompensas.

### Próxima feature funcional
Criar UI de escolha de adversários no Dojo: filtros por **Personagens**, **Jogadores** e **NPCs**, incluindo nome, retrato, nível, graduação, disponibilidade e contexto. A lista de catálogo pode incluir os 188 registros com fallback; não permitir botão de combate real até haver sessão/protocolo de combate no servidor para aquela origem. Separar **PvE contra personagem** de **projeção assíncrona de jogador** e **PvP real**; os últimos dois não devem ser confundidos. Depois, executar o redesign Kurokage 4.0 (issue #79).

**Custo incremental de serviços nesta etapa: zero.**
