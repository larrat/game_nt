# Fórmulas e progressão observadas no Kurokage

> Este documento descreve o código atualmente versionado do Kurokage. **Não afirma que essas fórmulas sejam as fórmulas do Naruto Game.** Para este último, as fontes públicas consultadas fornecem atributos e requisitos gerais, mas não uma tabela matemática atual e completa. As fórmulas abaixo precisam de testes de caracterização antes de qualquer mudança.

## Curva de experiência

Origem: src/utils/engine.js e migrations/009_migracao_xp_combate_treino.sql.

- XP total necessário para alcançar nível L: 0 para L <= 1; caso contrário floor(500 × L^1.8).
- Nível a partir de XP total: começa em 1 e incrementa enquanto o XP alcançar o limiar do próximo nível.
- Curva de XP da vila: 0 para L <= 1; caso contrário floor(2000 × L^1.5), com inversão por laço equivalente.

**Teste necessário:** para uma faixa de níveis representativa, garantir que JavaScript e SQL devolvam o mesmo limiar e nível. Verificar valores negativos, nulos e XP muito alto.

## Atributos derivados (JavaScript)

Origem: src/utils/engine.js. Abreviações para leitura: NIN=Ninjutsu, GEN=Genjutsu, TAI=Taijutsu, BUK=Bukijutsu, RES=Resistência, ENE=Energia, FOR=Força, INT=Inteligência, AGI=Agilidade, SEL=Selo.

| Derivado | Regra observada |
|---|---|
| HP máximo | 100 + nível×30 + RES×15 + ENE×20 + FOR×5 + bônus de graduação + bônus de equipamento; multiplicadores Senju ×1,10, Uzumaki ×1,05, Akimichi ×1,08, arredondados para baixo. |
| Chakra máximo | floor((100 + nível×20 + ENE×5 + NIN×5 + GEN×5 + bônus de graduação + bônus de equipamento) × multiplicador do clã). |
| Stamina máxima | 100 + nível×20 + ENE×5 + TAI×5 + BUK×5 + bônus de graduação + bônus de equipamento. |
| Ataque físico TAI/BUK | FOR + TAI×2 + BUK×2 + 5 + bônus de equipamento mapeados para TAI/BUK. |
| Ataque mágico NIN/GEN | INT×2 + NIN×2 + GEN×2 + 10 + bônus de equipamento mapeados para NIN/GEN. |
| Defesa física | floor(RES + (TAI + BUK)/4 + bônus de defesa física). |
| Defesa mágica | floor(RES + (NIN + GEN)/4 + bônus de defesa mágica). |
| Crítico | min(50, floor(AGI/10)) por cento. |
| Esquiva | min(50, floor(AGI/10)) por cento. |
| Desconto de chakra | min(50, floor(SEL/5)) por cento. |
| Perfuração | AGI×2. |
| Precisão | SEL×2. |
| Concentração | floor((INT+GEN)/2). |
| Percepção | floor((AGI+NIN)/2). |
| Convicção | floor((ENE+FOR)/2). |
| Determinação | floor((ENE+RES)/2). |

### Bônus de graduação no motor JavaScript

| Graduação | HP | Chakra | Stamina |
|---|---:|---:|---:|
| Estudante da Academia | 0 | 0 | 0 |
| Genin | 150 | 150 | 150 |
| Chunin | 350 | 300 | 300 |
| Jounin | 600 | 500 | 500 |
| ANBU | 1.000 | 800 | 800 |
| Sannin | 1.500 | 1.200 | 1.200 |
| Herói | 2.500 | 2.000 | 2.000 |

### Passivas de clã observadas

- Senju: +10% HP máximo.
- Uzumaki: +15% chakra máximo e +5% HP.
- Uchiha: +15% chance de crítico.
- Hyuga: +20% penetração de armadura.
- Nara: 10% chance de paralisar, conforme lógica de combate.
- Inuzuka: +10% ataque físico.
- Kaguya: +15% dano de Taijutsu.
- Aburame: 10% chance de envenenar.
- Akimichi: +8% HP e maior resistência conforme a descrição.
- Yamanaka: 8% controle mental.
- Hozuki: +10% chakra máximo.
- Yuki: +12% dano de gelo (Suiton/Futon).

Essas descrições coexistem com cálculos específicos em diferentes pontos do código; verificar quais passivas estão realmente aplicadas em cada modo de combate.

## Equipamentos e aprimoramentos

- O motor JavaScript normaliza chaves de bônus e aplica multiplicador de equipamento igual a 1 + 0,2 × nível de aprimoramento.
- Aprimoramentos de jutsus são somados a partir de atributos absorvidos e slots. Exemplos codificados: dano +5/+15/+30/+50/+100 conforme tier; custo -2/-5/-10/-15/-25; letalidade +2/+5/+10/+15/+25; proteção +10/+25/+50/+100/+200. Há limites posteriores no código.
- LootEngine define faixas de atributos e probabilidades de raridade por graduação. Elas são configurações próprias do Kurokage, não evidências de drop do Naruto Game.

## Vantagens elementais observadas no JavaScript

O motor implementa bônus de 1,2 para Suiton > Katon > Futon > Raiton > Doton > Suiton e penalidade de 0,8 para a relação inversa. Há também relações físicas codificadas entre Juken, Goken e Kenjutsu. A RPC SQL examinada implementa apenas parte dessa matriz.

## Divergências identificadas entre JavaScript e SQL

| Tema | JavaScript | SQL versionado | Impacto |
|---|---|---|---|
| Crítico base | floor(AGI/10), com teto de 50% | resolver_turno_combate calcula floor(AGI/5) antes de adicionar bônus | SQL pode duplicar a chance base de crítico. |
| Bônus de equipamento | Normaliza as chaves e multiplica por 1 + 0,2 × upgrade_level | get_equipment_bonus soma bonus_stats por chave direta; não aplica o mesmo normalizador nem o multiplicador de aprimoramento no trecho examinado | Status calculados podem divergir. |
| Vantagem elemental | Ciclo de cinco elementos e relações físicas | Código da RPC mostra Katon contra Futon; não reproduz a matriz completa | Combate pode variar conforme o caminho usado. |
| Precisão/ataque | UI usa status derivados do personagem | RPC deriva alguns valores da tabela, mas também aceita debuffs, invocação, multiplicador de portão e estatísticas do alvo via parâmetros do cliente | Entradas de combate não são todas autoritativas. |
| Assinatura da RPC de combate | src/pages/Combate.jsx envia p_player_atk_fis e p_player_atk_mag | migrations/001_combat_rpc.sql não declara esses dois parâmetros; também declara p_player_id UUID, enquanto outras migrações e chaves do projeto sugerem IDs inteiros | Possível divergência entre migrations e função realmente implantada. Confirmar a assinatura no banco antes de aplicar alterações. |

## Plano de testes de caracterização

Antes de mudar regras, escrever testes que fixem a saída atual para:
1. personagem sem equipamento/clã e nível baixo;
2. personagem em cada graduação, verificando bônus de HP/chakra/stamina;
3. cada ciclo elemental de vantagem, desvantagem e neutralidade;
4. chance de crítico/esquiva nos limites 0, 10, 500+ AGI;
5. mesmo conjunto de equipamento com aprimoramento 0, 1, 2 e valor alto;
6. custo de chakra antes/depois do desconto e dos slots;
7. igualdade entre funções equivalentes em JavaScript e SQL.

Somente após esse registro deve ser decidida a fórmula canônica. Não corrigir divergências “por intuição”, porque isso pode mudar o balanceamento e os personagens existentes.
