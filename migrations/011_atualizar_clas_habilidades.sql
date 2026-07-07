-- migrations/011_atualizar_clas_habilidades.sql

-- 1. Assegurar que a coluna 'name' é única para usarmos ON CONFLICT
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clans_name_key') THEN
        ALTER TABLE public.clans ADD CONSTRAINT clans_name_key UNIQUE (name);
    END IF;
END $$;

-- 2. Garantir que a tabela clan_skills tenha um ID auto-increment (caso não tenha)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'clan_skills_id_seq') THEN
        CREATE SEQUENCE public.clan_skills_id_seq;
        ALTER TABLE public.clan_skills ALTER COLUMN id SET DEFAULT nextval('public.clan_skills_id_seq');
        ALTER SEQUENCE public.clan_skills_id_seq OWNED BY public.clan_skills.id;
    END IF;
END $$;

-- 2.5 Limpar as habilidades antigas para reinserirmos as novas (evita duplicatas caso rode duas vezes)
TRUNCATE TABLE public.clan_skills RESTART IDENTITY CASCADE;

-- 2.6 Sincronizar a sequence de IDs dos clãs (evita o erro "Key (id)=(1) already exists" se a sequence estiver dessincronizada)
SELECT setval('clans_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM clans), false);

-- 3. Inserir ou Atualizar os Clãs
INSERT INTO public.clans (name, description, village_id) VALUES
('Uchiha', 'Descendentes de Indra Ōtsutsuki, o clã Uchiha é famoso por seu Dōjutsu, o Sharingan, e sua formidável aptidão para o estilo Fogo.', NULL),
('Hyūga', 'Um dos quatro clãs nobres de Konoha. Possuem o Byakugan, que lhes permite visão de 360 graus e a habilidade de ver a rede de chakra.', NULL),
('Uzumaki', 'Originários de Uzushiogakure, são conhecidos por sua força vital absurda, longevidade e maestria em Fūinjutsu (técnicas de selamento).', NULL),
('Senju', 'O clã de mil habilidades. Fundadores de Konoha junto com os Uchihas. Descendentes de Asura Ōtsutsuki, herdeiros de uma força vital incomparável.', NULL),
('Nara', 'Especialistas na manipulação das sombras e detentores de um intelecto brilhante e estratégico.', NULL),
('Yamanaka', 'Mestres em técnicas de controle e comunicação mental, além de possuírem forte afinidade botânica.', NULL),
('Akimichi', 'Especialistas na manipulação de calorias, podendo expandir partes de seu corpo para aumentar devastadoramente sua força física.', NULL),
('Aburame', 'Especialistas no uso de insetos Kikaichū, que habitam seus corpos em simbiose, drenando chakra de oponentes e defendendo o hospedeiro.', NULL),
('Inuzuka', 'Trabalham em sincronia perfeita com seus cães ninjas (ninken), lutando de forma bestial com agilidade sobre-humana.', NULL),
('Sarutobi', 'Um dos primeiros clãs a se juntar a Konoha. Famosos por sua lealdade, força de vontade inabalável e afinidade primorosa com ninjutsu.', NULL),
('Hatake', 'Um clã pequeno mas lendário, responsável por gerar shinobis de talento e instinto de combate prodigiosos.', NULL),
('Kaguya', 'Clã de guerreiros bárbaros extintos que possuíam o Shikotsumyaku, permitindo a manipulação irrestrita da própria estrutura óssea.', NULL),
('Yuki', 'Clã com a linhagem Kekkei Genkai Hyōton (Liberação de Gelo), controlando a água e o vento para congelar o ambiente.', NULL),
('Hōzuki', 'Nativos da Vila da Névoa, capazes de liquefazer seus corpos por vontade própria, anulando ataques físicos diretos.', NULL),
('Jūgo', 'O clã que deu origem ao Selo Amaldiçoado, capazes de absorver energia natural passivamente, resultando em força absurda, porém sujeitos à insanidade.', NULL)
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description;


-- 4. Inserir as Habilidades de Clã (Nível 1 ao 5)
DO $$
DECLARE
    v_clan_id INT;
BEGIN

    -- UCHIHA
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Uchiha';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Sharingan', 'Nível 1', 'Desperta a percepção visual aguçada.'),
    (v_clan_id, 'Sharingan Evoluído', 'Nível 2', 'Aumenta a precisão de movimentos e o foco.'),
    (v_clan_id, 'Sharingan Maduro', 'Nível 3', 'Permite prever ataques físicos e copiar habilidades básicas.'),
    (v_clan_id, 'Mangekyō Sharingan', 'Nível 4', 'Desperta o poder ocular avançado e técnicas avassaladoras.'),
    (v_clan_id, 'Eternal Mangekyō Sharingan', 'Nível 5', 'Poder perfeito sem o risco de perder a visão.');

    -- HYŪGA
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Hyūga';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Byakugan', 'Nível 1', 'Abre o campo de visão em 360 graus.'),
    (v_clan_id, 'Visão Penetrante', 'Nível 2', 'Enxerga através de fumaça, neblina e pequenos obstáculos físicos.'),
    (v_clan_id, 'Punho Gentil', 'Nível 3', 'Capacidade de aplicar dano direto nos órgãos internos do alvo.'),
    (v_clan_id, 'Mestre do Jūken', 'Nível 4', 'Bloqueio instantâneo de múltiplos Tenketsus.'),
    (v_clan_id, 'Byakugan Supremo', 'Nível 5', 'Visão absoluta e percepção divina sobre a rede de chakra e movimentos.');

    -- UZUMAKI
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Uzumaki';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Vitalidade Uzumaki', 'Nível 1', 'Regeneração acelerada de ferimentos leves.'),
    (v_clan_id, 'Chakra Abundante', 'Nível 2', 'Reservas massivas de energia que dificultam o esgotamento.'),
    (v_clan_id, 'Herança Uzumaki', 'Nível 3', 'Longevidade aumentada e resistência incrível em longas batalhas.'),
    (v_clan_id, 'Correntes Adamantinas', 'Nível 4', 'Manifesta correntes de chakra capazes de selar Bijuus e prender inimigos.'),
    (v_clan_id, 'Mestre do Fūinjutsu', 'Nível 5', 'Domínio absoluto sobre selamentos de alto nível.');

    -- SENJU
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Senju';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Vontade do Fogo', 'Nível 1', 'Força de vontade que aumenta resistência contra ilusões.'),
    (v_clan_id, 'Vitalidade Senju', 'Nível 2', 'Corpo poderoso com alta aptidão física e regenerativa.'),
    (v_clan_id, 'Corpo Lendário', 'Nível 3', 'Aumento passivo da resiliência a dano e estamina inabalável.'),
    (v_clan_id, 'Herança de Hashirama', 'Nível 4', 'Recuperação extraordinária de HP sem necessitar focar chakra curativo.'),
    (v_clan_id, 'Espírito Senju', 'Nível 5', 'Auge da durabilidade, assemelhando-se ao Deus Shinobi em robustez.');

    -- NARA
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Nara';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Sombra Desperta', 'Nível 1', 'Pode alongar a própria sombra de forma rudimentar.'),
    (v_clan_id, 'Manipulação Sombria', 'Nível 2', 'Aprisiona temporariamente os pés dos adversários incautos.'),
    (v_clan_id, 'Mestre das Sombras', 'Nível 3', 'O Kagemane no Jutsu agora imobiliza perfeitamente os inimigos.'),
    (v_clan_id, 'Domínio Sombrio', 'Nível 4', 'A sombra agora pode causar asfixia e criar formas afiadas.'),
    (v_clan_id, 'Sombra Suprema', 'Nível 5', 'Controle irrestrito e letalidade absoluta do Fio das Sombras Negro.');

    -- YAMANAKA
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Yamanaka';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Mente Aguçada', 'Nível 1', 'Percepção melhorada do ambiente ao redor.'),
    (v_clan_id, 'Conexão Mental', 'Nível 2', 'Permite enviar curtas mensagens mentais para aliados próximos.'),
    (v_clan_id, 'Domínio Psíquico', 'Nível 3', 'Invade a mente adversária por tempo limitado, lendo intenções.'),
    (v_clan_id, 'Consciência Expandida', 'Nível 4', 'Pode assumir controle de um alvo com forte conexão mental (Shintenshin).'),
    (v_clan_id, 'Mestre da Mente', 'Nível 5', 'Controle mental superior, transferindo consciência entre alvos e anulando psiques rivais.');

    -- AKIMICHI
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Akimichi';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Constituição Robusta', 'Nível 1', 'Músculos e ossos espessos que garantem bônus defensivo contra taijutsu.'),
    (v_clan_id, 'Expansão Parcial', 'Nível 2', 'Aumenta braços ou pernas para aumentar consideravelmente a força bruta de um golpe.'),
    (v_clan_id, 'Expansão Completa', 'Nível 3', 'Transforma o próprio corpo numa bola maciça para ataque em área.'),
    (v_clan_id, 'Calorias em Chakra', 'Nível 4', 'Converte a massa corporal acumulada em jorros de chakra violento.'),
    (v_clan_id, 'Modo Borboleta', 'Nível 5', 'Pico de poder, manifestando asas de puro chakra que concedem velocidade e força colossais.');

    -- ABURAME
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Aburame';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Kikaichū', 'Nível 1', 'Pode usar insetos rasteiros para espionagem e pequenos ataques.'),
    (v_clan_id, 'Colônia Estável', 'Nível 2', 'A colônia de insetos em simbiose ajuda a dissipar pequenos focos de veneno e genjutsu.'),
    (v_clan_id, 'Enxame', 'Nível 3', 'Libera uma nuvem de insetos devoradores de chakra contra os alvos.'),
    (v_clan_id, 'Colônia Avançada', 'Nível 4', 'Acesso a insetos venenosos raros e capacidade letal aumentada.'),
    (v_clan_id, 'Rei da Colônia', 'Nível 5', 'Forma um avatar protetor de insetos intransponível que devora chakra imediatamente ao toque.');

    -- INUZUKA
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Inuzuka';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Instinto Selvagem', 'Nível 1', 'Aprimora brutalmente a audição e o faro.'),
    (v_clan_id, 'Sincronia Canina', 'Nível 2', 'Os golpes taijutsu recebem acréscimo de dano graças ao trabalho em equipe.'),
    (v_clan_id, 'Presas Gêmeas', 'Nível 3', 'O cão e o dono atacam girando rapidamente como tornados cortantes (Gatsūga).'),
    (v_clan_id, 'Fera Interior', 'Nível 4', 'Transforma o Ninken de forma simbiótica num enorme lobo de duas cabeças.'),
    (v_clan_id, 'Mestre dos Ninken', 'Nível 5', 'Modo Lobo de 3 Cabeças, combinando velocidade absurda com letalidade animal sem paralelos.');

    -- SARUTOBI
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Sarutobi';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Talento Shinobi', 'Nível 1', 'Habilidade natural acima da média com fundamentos (clones, substituição, shurikenjutsu).'),
    (v_clan_id, 'Afinidade Elemental', 'Nível 2', 'Facilidade superior para dominar qualquer tipo de Natureza de Chakra sem penalidades.'),
    (v_clan_id, 'Mestre Ninjutsu', 'Nível 3', 'O consumo de chakra de todas as habilidades mágicas (Ninjutsu) é diminuído.'),
    (v_clan_id, 'Herança Sarutobi', 'Nível 4', 'Soma de experiências milenares em combate que aumenta o reflexo contra ataques fulminantes.'),
    (v_clan_id, 'Professor Supremo', 'Nível 5', 'Capacidade de usar invocações lendárias macacas e combinar múltiplos elementos de forma letal.');

    -- HATAKE
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Hatake';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Instinto de Combate', 'Nível 1', 'Uma antecipação primária de movimentos alheios por puro reflexo.'),
    (v_clan_id, 'Gênio Shinobi', 'Nível 2', 'Velocidade elevada na realização de selos de mão, permitindo ataques-surpresa rápidos.'),
    (v_clan_id, 'Precisão Cirúrgica', 'Nível 3', 'Maestria mortal com armas brancas (Tantō e Kunai), causando dano crítico massivo.'),
    (v_clan_id, 'Ninja de Elite', 'Nível 4', 'Conhecimento absurdo em campo que lhe permite encontrar fraquezas elementais inimigas com um olhar.'),
    (v_clan_id, 'Lenda de Konoha', 'Nível 5', 'Estilo Canino Branco, uma investida letal impossível de ser desviada por shinobis comuns.');

    -- KAGUYA
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Kaguya';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Ossos Fortificados', 'Nível 1', 'Os ossos ficam rígidos como aço, reduzindo dano recebido.'),
    (v_clan_id, 'Shikotsumyaku', 'Nível 2', 'Permite projetar ossos rudimentares para fora do corpo como armas brancas.'),
    (v_clan_id, 'Dança dos Ossos', 'Nível 3', 'Regeneração óssea instantânea que acompanha estilos de luta fluidos e assassinos.'),
    (v_clan_id, 'Corpo Imortal', 'Nível 4', 'A armadura de ossos sob a pele fica impenetrável contra armas comuns.'),
    (v_clan_id, 'Dança da Camélia Suprema', 'Nível 5', 'Pode transformar um ambiente inteiro num campo de lâminas de ossos gigantes e brocas intransponíveis.');

    -- YUKI
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Yuki';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Frio Interior', 'Nível 1', 'Resistência ao clima absoluto e a ninjutsus básicos de Gelo/Água.'),
    (v_clan_id, 'Hyōton', 'Nível 2', 'Capacidade de congelar água ou ar úmido ao redor formando agulhas.'),
    (v_clan_id, 'Mestre do Gelo', 'Nível 3', 'Criação de domos glaciais que repelam grandes massas de dano de Fogo.'),
    (v_clan_id, 'Tempestade Congelante', 'Nível 4', 'Manipulação instantânea de gelo a nível molecular e criação de espelhos espaciais falsos.'),
    (v_clan_id, 'Imperador do Gelo', 'Nível 5', 'Espelhos Demoníacos de Cristal de Gelo completos, atacando de inúmeras direções na velocidade da luz.');

    -- HŌZUKI
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Hōzuki';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Corpo Líquido', 'Nível 1', 'Pequenas áreas do corpo viram líquido contra impactos simples.'),
    (v_clan_id, 'Hidrificação', 'Nível 2', 'Pode transformar braços ou pernas em água condensada para aumentar pressão de golpe.'),
    (v_clan_id, 'Corpo Fluido', 'Nível 3', 'Permite transformar-se integralmente em poça d''água para evitar a morte. Muito fraco a Relâmpago.'),
    (v_clan_id, 'Mestre da Água', 'Nível 4', 'Habilidade de atirar projéteis pressurizados de água (Mizu Teppō) letalmente.'),
    (v_clan_id, 'Demônio Líquido', 'Nível 5', 'Jutsu Grande Demônio da Água (Tate Eboshi), mesclando a si mesmo a fontes gigantes de água.');

    -- JŪGO
    SELECT id INTO v_clan_id FROM clans WHERE name = 'Jūgo';
    INSERT INTO clan_skills (clan_id, name, req_label, description) VALUES
    (v_clan_id, 'Energia Natural', 'Nível 1', 'Pode sugar fracamente o chakra natural da fauna e flora.'),
    (v_clan_id, 'Mutação', 'Nível 2', 'A pele muda parcialmente e forma membros bestiais ao atacar (pistões e couraças).'),
    (v_clan_id, 'Transformação Parcial', 'Nível 3', 'Selo da Maldição Nível 1; a mente se deturpa e a força escala exponencialmente.'),
    (v_clan_id, 'Transformação Completa', 'Nível 4', 'Selo da Maldição Nível 2; regeneração violenta e pele escurecida resistente a impactos.'),
    (v_clan_id, 'Sábio Selvagem', 'Nível 5', 'Absorve infinitamente energia natural sem morrer (mas em fúria berserker assassina), canalizando lasers de chakra bruto da natureza.');

END $$;
