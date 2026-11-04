-- KUROKAGE • retratos iniciais complementares de Kakashi e Madara
-- Fonte dos identificadores: docs/reverse-engineering/coleta-2026-10-30/personagens-catalogo/temas-vip.json
-- A origem é uma referência de catálogo (não há download ou cópia de imagens neste script).
-- Pré-condição: personagens 4 (Kakashi) e ng-initial-122 (Madara) existentes.
-- Apenas retratos cosméticos da MESMA versão (Clássico / Shippuden).
-- Não atribui poderes nem libera formas ANBU, Hokage, Rikudou, Juubi ou Susanoo.
-- Inserção idempotente: sem alterar avatares, jogadores ou personagens preexistentes.
-- A existência HTTP e a qualidade visual dos arquivos remotos requerem QA no navegador.
BEGIN;
WITH candidates (id, name, character_id) AS (
  VALUES
  ('https://narutogame.com.br/assets/images/logado/profile/60/21.png', 'Kakashi — Clássico · Retrato 2', '4'),
  ('https://narutogame.com.br/assets/images/logado/profile/60/22.png', 'Kakashi — Clássico · Retrato 3', '4'),
  ('https://narutogame.com.br/assets/images/logado/profile/60/25.png', 'Kakashi — Clássico · Retrato 4', '4'),
  ('https://narutogame.com.br/assets/images/logado/profile/60/44.png', 'Kakashi — Clássico · Retrato 5', '4'),
  ('https://narutogame.com.br/assets/images/logado/profile/122/10.png', 'Madara — Shippuden · Retrato 2', 'ng-initial-122'),
  ('https://narutogame.com.br/assets/images/logado/profile/122/11.png', 'Madara — Shippuden · Retrato 3', 'ng-initial-122'),
  ('https://narutogame.com.br/assets/images/logado/profile/122/17.png', 'Madara — Shippuden · Retrato 4', 'ng-initial-122')
)
INSERT INTO public.avatars (id, name, character_id, is_base, evolution_target_id, evolution_req_level, evolution_desc)
SELECT candidates.id, candidates.name, candidates.character_id, TRUE, NULL, 0, NULL
FROM candidates
JOIN public.characters AS c ON c.id = candidates.character_id
ON CONFLICT (id) DO NOTHING;
COMMIT;

-- Auditoria pós-aplicação:
-- SELECT c.name, count(*) FILTER (WHERE a.is_base) AS iniciais
-- FROM public.avatars a JOIN public.characters c ON c.id=a.character_id
-- WHERE c.id IN ('4', 'ng-initial-122')
-- GROUP BY c.name ORDER BY c.name;
