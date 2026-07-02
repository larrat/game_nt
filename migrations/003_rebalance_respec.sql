-- migrations/003_rebalance_respec.sql

-- Este script executa a Fase B do rebalanceamento:
-- 1. Zera todos os atributos investidos dos jogadores.
-- 2. Soma todos os pontos investidos e os devolve para a coluna `pontos_atributos`.
-- 3. Recalcula HP, Chakra e Stamina de todos os jogadores para seus valores Base (já que atributos estarão zerados).
-- A nova fórmula de HP não usa mais Ene, apenas Res.

UPDATE players
SET 
    -- 1. Devolver pontos
    pontos_atributos = COALESCE(pontos_atributos, 0) + 
                       COALESCE(resistencia, 0) + 
                       COALESCE(energia, 0) + 
                       COALESCE(forca, 0) + 
                       COALESCE(inteligencia, 0) + 
                       COALESCE(taijutsu, 0) + 
                       COALESCE(ninjutsu, 0) + 
                       COALESCE(genjutsu, 0) + 
                       COALESCE(bukijutsu, 0) + 
                       COALESCE(agilidade, 0),
                       
    -- 2. Zerar atributos
    resistencia = 0,
    energia = 0,
    forca = 0,
    inteligencia = 0,
    taijutsu = 0,
    ninjutsu = 0,
    genjutsu = 0,
    bukijutsu = 0,
    agilidade = 0,
    
    -- 3. Recalcular HP, CP, Stamina para valores Base (Level only)
    -- HP Base: 100 + (level * 30)
    -- CP/ST Base: 100 + (level * 20)
    hp = 100 + (COALESCE(level, 1) * 30),
    chakra = 100 + (COALESCE(level, 1) * 20),
    stamina = 100 + (COALESCE(level, 1) * 20);

-- Nota: Como o bônus de Rank e Clã é aplicado em tempo real no client ou através das funções engine.js, 
-- a tabela `players` armazena apenas os Atributos Brutos/Base, então a query acima é suficiente para o Respec Global.
