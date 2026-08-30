-- Migration: 20260821160000_search_history.sql
-- Description: Per-user recent search history for the CampusBrain search box.

CREATE TABLE public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_history_user_created ON public.search_history (user_id, created_at DESC);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search history" ON public.search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history" ON public.search_history
  FOR DELETE USING (auth.uid() = user_id);

-- No INSERT policy: rows are only ever written through record_search_history
-- below, which runs SECURITY DEFINER and stamps user_id from auth.uid()
-- itself, so a client can never write history under someone else's id.
REVOKE ALL ON public.search_history FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.search_history TO authenticated;

-- Records a search query for the calling user, de-duplicating
-- case-insensitively (re-searching bumps the existing entry to the top
-- rather than adding a second row) and capping history at 8 rows per user.
CREATE OR REPLACE FUNCTION public.record_search_history(p_query text)
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

  INSERT INTO public.search_history (user_id, query)
  VALUES (v_uid, v_query);

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

REVOKE ALL ON FUNCTION public.record_search_history(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_search_history(text) TO authenticated;
