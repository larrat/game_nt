# Inventário de retratos e migração visual — Kurokage

Auditoria de leitura em 31/10/2026. Fontes: `public.characters`, `public.npcs` do projeto Supabase, e pasta `public/images` do repositório. Nenhuma alteração de dados no banco.

## Cobertura existente

| Conjunto | Total | Cobertura observada |
| --- | ---: | --- |
| Catálogo de personagens (`characters`) | 188 | 4 URLs locais em `base_avatar_url`; 184 URLs externas sob `narutogame.com.br` |
| NPCs ativos (`npcs`) | 15 | Apenas Naruto tinha retrato nomeado local reconhecido pelo resolvedor anterior; a maioria dos registros usa emoji |
| Acervo local nomeado | 4 imagens principais | `naruto.jpg`, `sasuke.jpg`, `sakura.jpg`, `kakashi.jpg` |
| Variações do Sasuke | 28 imagens | Em `public/images/avatares/`; cinco variantes explicitamente reconhecidas pelo novo resolvedor |
| Arte genérica do jogo | 2 imagens | `public/images/chars/`, utilizadas como substituto visual de NPCs **genéricos** e renegados dinâmicos |
| World Boss | 1 SVG original | `public/images/bosses/raposa-nove-caudas.svg` |

**Atenção:** 184 URLs externas não equivalem a arquivos locais disponíveis. Não usar automaticamente imagens protegidas de terceiros em produção; depender do site de origem cria risco de hotlink, indisponibilidade e licenciamento. A correspondência `characters.id` (texto) **não é** a mesma de `npcs.id` (número), e IDs do Naruto Game não podem ser usados como IDs internos.

## NPCs observados no banco (15 ativos)

- **Arte exata local:** Naruto Uzumaki.
- **Arte genérica local apropriada ao papel (provisória):** Bandido do Deserto, Mercenário da Névoa, Ladrão de Pergaminhos. O último possuía a URL legada incorreta `/images/char_rogue_ninja_1782968348009.jpg`; o arquivo real está em `/images/chars/` e agora é resolvido por identidade, sem alteração SQL.
- **Identidade sem arte local verificada (fallback neutro):** Kiba Inuzuka, Rock Lee, Neji Hyuga, Gaara, Itachi Uchiha, Kisame Hoshigaki, Zabuza Momochi, Deidara, Exame Chunin — Etapas 1, 2 e 3.

Esse grupo tem **11 registros** aguardando retratos próprios/licenciados. Emojis e silhuetas restantes não devem ser apresentados como arte definitiva.

## Padrões da etapa

1. Mapa e Radar de Ameaças agora reutilizam o mesmo `NpcPortrait` e a mesma função `getNpcPortrait` do Combate e da História.
2. Imagens locais têm fallback visual em caso de erro, `alt` adequado, carregamento preguiçoso e identificação do alvo no botão do mapa.
3. O resolvedor aceita somente paths internos para artes explícitas; URLs externas do catálogo não são usadas como hotlink nessa integração.
4. Renegados gerados usam um dos dois retratos neutros já existentes; fantasmas de jogadores mantêm identidade separada.
5. Nenhuma mudança nas recompensas, combate, RLS, dados SQL ou dependências do projeto.

## Critérios para encerrar o mapeamento

- Criar/autorizar retratos específicos para os 11 NPCs nomeados sem arquivo correspondente.
- Verificar e normalizar o catálogo de 188 personagens, priorizando cópias de uso autorizado/novas artes originais. A auditoria atual **não** significa que essas 184 URLs funcionem ou estejam licenciadas.
- Incluir fontes, variantes, nomes e fallback em registro central, sem adivinhar IDs.
- Executar testes e build; avaliar as telas de Mapa, Combate, História e World Boss com conta de homologação.

## Sequência após o inventário — Layout Kurokage 4.0

1. **Design tokens:** paleta, tipografia, tipografia numérica, bordas, espaçamento, foco, contraste e densidade.
2. **Shell do jogo:** sidebar com ícones padronizados, topbar, recursos persistentes, busca e responsividade.
3. **Componentes:** painéis de informações, `NpcPortrait`, estados de carregamento, tooltips, marcadores do mapa e cartas de personagens.
4. **Telas:** Dashboard → Status → Treinamento/Técnicas → Missões → Combate → Mapa/Vila/Eventos.
5. **Validação:** desktop e mobile; leitura de HP, Chakra, Stamina, XP, custo/recompensas, turnos e cooldowns sem rolagem excessiva.

Manter a próxima reformulação de layout em PR própria; separar estética de lógica e manter custo incremental de serviços pagos em zero.
