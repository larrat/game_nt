-- Validate player titles on the server rather than trusting the UI dropdown.
CREATE OR REPLACE FUNCTION public.atualizar_titulo_jogador(
    p_player_id integer,
    p_title text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_title text := btrim(COALESCE(p_title, ''));
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    IF v_title NOT IN (
        'Nenhum(a)',
        'Aniversariante',
        'Genin',
        'Sasori',
        'Chuunin',
        'Guerreiro Iniciante',
        'Shinobi de Elite',
        'A Escuridão da Esperança',
        'O Renegado',
        'Jounin',
        'A Lenda Sannin',
        'Mais Forte que um Kage',
        'Campeão da Vila',
        'Um Novo Recomeço',
        'Transbordando Poder',
        'Exorcista',
        'ANBU',
        'Ninja Verificado'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Título inválido.');
    END IF;

    PERFORM 1
    FROM public.players
    WHERE id = p_player_id
      AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    UPDATE public.players
    SET title = v_title
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'title', v_title);
END;
$function$;

REVOKE UPDATE (title) ON TABLE public.players FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.atualizar_titulo_jogador(integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_titulo_jogador(integer, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
