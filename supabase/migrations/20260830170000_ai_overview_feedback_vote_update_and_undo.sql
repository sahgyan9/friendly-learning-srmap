-- =============================================================================
-- Migration: 20260830170000_ai_overview_feedback_vote_update_and_undo.sql
-- Description: Allow changing (up <-> down) and undoing (clearing) CampusBrain
--              AI Overview feedback votes, tracking votes per query and session.
-- =============================================================================

-- 1. Add session_id and updated_at to ai_overview_feedback
ALTER TABLE public.ai_overview_feedback 
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Backfill pre-existing rows with fallback session_id so none are null
UPDATE public.ai_overview_feedback 
SET session_id = id::text 
WHERE session_id IS NULL;

-- 3. Deduplicate any duplicate query + session_id in legacy rows before adding constraint
DELETE FROM public.ai_overview_feedback a
USING public.ai_overview_feedback b
WHERE a.created_at < b.created_at
  AND a.query = b.query
  AND a.session_id = b.session_id;

-- 4. Unique constraint on (query, session_id) to prevent duplicate votes per session
ALTER TABLE public.ai_overview_feedback
  DROP CONSTRAINT IF EXISTS ai_overview_feedback_query_session_key;

ALTER TABLE public.ai_overview_feedback
  ADD CONSTRAINT ai_overview_feedback_query_session_key UNIQUE (query, session_id);

CREATE INDEX IF NOT EXISTS idx_ai_overview_feedback_query_session
  ON public.ai_overview_feedback (query, session_id);

-- 5. RPC: submit_ai_overview_feedback
-- Handles both voting (is_helpful = true/false -> upsert) and undoing (is_helpful = null -> delete).
CREATE OR REPLACE FUNCTION public.submit_ai_overview_feedback(
  p_query TEXT,
  p_response JSONB DEFAULT '{}'::jsonb,
  p_is_helpful BOOLEAN DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_query TEXT;
  v_session_id TEXT;
  v_user_id UUID;
  v_feedback_id UUID;
BEGIN
  v_query := trim(p_query);
  IF v_query IS NULL OR v_query = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Query cannot be empty');
  END IF;

  v_user_id := auth.uid();
  v_session_id := NULLIF(trim(p_session_id), '');
  IF v_session_id IS NULL THEN
    IF v_user_id IS NOT NULL THEN
      v_session_id := v_user_id::text;
    ELSE
      v_session_id := 'anon_' || md5(v_query);
    END IF;
  END IF;

  IF p_is_helpful IS NULL THEN
    -- Undo / clear vote
    DELETE FROM public.ai_overview_feedback
    WHERE query = v_query
      AND session_id = v_session_id
    RETURNING id INTO v_feedback_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'cleared',
      'id', v_feedback_id,
      'query', v_query,
      'has_voted', null
    );
  ELSE
    -- Upsert vote (insert or update in place)
    INSERT INTO public.ai_overview_feedback (
      query,
      response,
      is_helpful,
      session_id,
      user_id,
      status,
      updated_at
    )
    VALUES (
      v_query,
      COALESCE(p_response, '{}'::jsonb),
      p_is_helpful,
      v_session_id,
      v_user_id,
      'new',
      now()
    )
    ON CONFLICT (query, session_id) DO UPDATE SET
      is_helpful = EXCLUDED.is_helpful,
      response = CASE 
        WHEN EXCLUDED.response IS NOT NULL AND EXCLUDED.response != '{}'::jsonb 
        THEN EXCLUDED.response 
        ELSE public.ai_overview_feedback.response 
      END,
      user_id = COALESCE(EXCLUDED.user_id, public.ai_overview_feedback.user_id),
      updated_at = now()
    RETURNING id INTO v_feedback_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'voted',
      'id', v_feedback_id,
      'query', v_query,
      'is_helpful', p_is_helpful,
      'has_voted', CASE WHEN p_is_helpful THEN 'up' ELSE 'down' END
    );
  END IF;
END;
$$;

-- 6. Permissions & Security
REVOKE ALL ON FUNCTION public.submit_ai_overview_feedback(TEXT, JSONB, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_ai_overview_feedback(TEXT, JSONB, BOOLEAN, TEXT) TO anon, authenticated, service_role;

-- Scoped RLS policies for authenticated users to update/delete their own rows directly
DROP POLICY IF EXISTS "Users can update their own feedback" ON public.ai_overview_feedback;
CREATE POLICY "Users can update their own feedback"
  ON public.ai_overview_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own feedback" ON public.ai_overview_feedback;
CREATE POLICY "Users can delete their own feedback"
  ON public.ai_overview_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

GRANT INSERT ON public.ai_overview_feedback TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.ai_overview_feedback TO authenticated;
