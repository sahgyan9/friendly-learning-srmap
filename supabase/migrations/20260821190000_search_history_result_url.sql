-- Migration: 20260821190000_search_history_result_url.sql
-- Description: Track the page a recent search actually resolved to (e.g. the
-- "Admin" quick-link), so re-selecting a history entry replays that same
-- destination instead of always falling back to the generic /search results
-- page. Plain full-text searches keep result_url NULL and still fall back
-- to /search on replay.

ALTER TABLE public.search_history ADD COLUMN result_url text;

-- Function parameter list is changing (text) -> (text, text default null),
-- which Postgres treats as a distinct overload; drop the old one first so
-- callers that still pass only p_query resolve to this one via its default.
DROP FUNCTION IF EXISTS public.record_search_history(text);

CREATE OR REPLACE FUNCTION public.record_search_history(p_query text, p_result_url text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_query text := trim(p_query);
BEGIN
  IF v_uid IS NULL OR v_query = '' THEN
    RETURN;
  END IF;

  DELETE FROM public.search_history
  WHERE user_id = v_uid AND lower(query) = lower(v_query);

  INSERT INTO public.search_history (user_id, query, result_url)
  VALUES (v_uid, v_query, p_result_url);

  DELETE FROM public.search_history
  WHERE user_id = v_uid
    AND id NOT IN (
      SELECT id FROM public.search_history
      WHERE user_id = v_uid
      ORDER BY created_at DESC
      LIMIT 8
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_search_history(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_search_history(text, text) TO authenticated;
