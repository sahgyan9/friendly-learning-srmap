-- =============================================================================
-- Search analytics: which searches found nothing, and which found nothing worth
-- clicking.
--
-- Neither question was answerable from the tables that already exist, and not
-- for want of data — the two halves simply cannot be joined:
--
--   search_query_cache   SHA-256 of the DISTILLED query ("machine learning
--                        faculty professor" — what useSearchResults sends to
--                        semantic-search after parseQuery strips it down)
--   search_interactions  md5 of the RAW query ("machine learning faculty" —
--                        what the student actually typed, which is what
--                        GoogleResultCard passes to log_search_click)
--
-- Different algorithm and different input string, so no join between them can
-- ever match. Rather than force one to imitate the other, this adds the one
-- table that answers the question directly.
--
-- It deliberately does NOT duplicate search_query_cache. That table's job is
-- caching embeddings so a repeat search costs a primary-key lookup instead of
-- a Gemini call; its query_text is a byproduct, and it is keyed on the
-- rewritten query because that is what gets embedded. This table is keyed on
-- what a person typed, because that is what an admin needs to read.
--
-- No viewer_id, on purpose. Answering "what are students looking for" needs
-- counts, not names, and a campus search box collects things students would
-- not want attributed to them. Per-person search history stays out of the
-- admin surface; search_history already covers a student seeing their own.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.search_analytics (
  -- md5 of the normalised RAW query. Must stay byte-identical to the
  -- expression in log_search_click below, or clicks stop matching searches.
  query_hash        VARCHAR(32) PRIMARY KEY,
  query_text        TEXT        NOT NULL,
  search_count      INT         NOT NULL DEFAULT 0,
  zero_result_count INT         NOT NULL DEFAULT 0,
  click_count       INT         NOT NULL DEFAULT 0,
  first_searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_searched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The admin page's three lists: recent, never-clicked, and zero-result.
CREATE INDEX IF NOT EXISTS idx_search_analytics_last_searched
  ON public.search_analytics (last_searched_at DESC);

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read search analytics" ON public.search_analytics;
CREATE POLICY "Admins can read search analytics"
  ON public.search_analytics FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true));

REVOKE ALL ON public.search_analytics FROM PUBLIC, anon, authenticated;
-- SELECT only; the policy above is what narrows it to admins. Writes happen
-- exclusively through the SECURITY DEFINER functions below.
GRANT SELECT ON public.search_analytics TO authenticated;

-- -----------------------------------------------------------------------------
-- log_search_run — called once per search, from useSearchResults.
--
-- Anon-callable for the same reason log_search_click is: most campus search
-- traffic is signed out, and analytics that only see logged-in students would
-- describe a different site than the one people use.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_search_run(
  p_query        TEXT,
  p_result_count INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_query_hash TEXT;
  v_text       TEXT;
BEGIN
  IF p_query IS NULL OR length(trim(p_query)) < 3 THEN
    RETURN;
  END IF;

  v_text       := left(trim(p_query), 300);
  v_query_hash := md5(regexp_replace(lower(trim(p_query)), '\s+', ' ', 'g'));

  INSERT INTO public.search_analytics AS sa
        (query_hash, query_text, search_count, zero_result_count)
  VALUES (v_query_hash, v_text, 1, CASE WHEN COALESCE(p_result_count, 0) = 0 THEN 1 ELSE 0 END)
  ON CONFLICT (query_hash) DO UPDATE
    SET search_count      = sa.search_count + 1,
        zero_result_count = sa.zero_result_count
                            + CASE WHEN COALESCE(p_result_count, 0) = 0 THEN 1 ELSE 0 END,
        last_searched_at  = now(),
        -- Keep the most recent spelling. The hash normalises case and
        -- whitespace, so "Machine  Learning" and "machine learning" share a
        -- row; showing the latest form is more useful than freezing the first.
        query_text        = EXCLUDED.query_text;
END;
$$;

REVOKE ALL ON FUNCTION public.log_search_run(TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_search_run(TEXT, INT) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- log_search_click — unchanged contract, now also credits the search.
--
-- Redefined in full rather than patched, because CREATE OR REPLACE FUNCTION
-- replaces the whole body. The click-logging half is byte-identical to
-- 20260823140000; only the search_analytics update is new.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_search_click(
  p_query       TEXT,
  p_entity_type TEXT,
  p_entity_id   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_query_hash TEXT;
BEGIN
  IF p_query IS NULL OR length(trim(p_query)) < 3
     OR p_entity_type IS NULL OR p_entity_id IS NULL THEN
    RETURN;
  END IF;

  v_query_hash := md5(regexp_replace(lower(trim(p_query)), '\s+', ' ', 'g'));

  INSERT INTO public.search_interactions (query_hash, entity_type, entity_id, viewer_id)
  VALUES (v_query_hash, left(p_entity_type, 50), left(p_entity_id, 255), auth.uid());

  -- Credit the search this click came from. An UPDATE that matches nothing is
  -- correct and silent: a click can only reach here from a results page, and
  -- that page logs its search first, but a click arriving without a search row
  -- should not invent one.
  UPDATE public.search_analytics
     SET click_count = click_count + 1
   WHERE query_hash = v_query_hash;
END;
$$;

REVOKE ALL ON FUNCTION public.log_search_click(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_search_click(TEXT, TEXT, TEXT)
  TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Retention, folded into the existing nightly job.
--
-- Redefined in full for the same CREATE OR REPLACE reason; everything above
-- the final DELETE is byte-identical to 20260823140000.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aggregate_search_quality()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.search_result_quality AS srq
        (entity_type, entity_id, click_count_30d, last_clicked_at)
  SELECT si.entity_type,
         si.entity_id,
         count(DISTINCT COALESCE(si.viewer_id::text, 'q:' || si.query_hash))::int,
         max(si.created_at)
  FROM public.search_interactions si
  WHERE si.created_at >= now() - interval '30 days'
  GROUP BY si.entity_type, si.entity_id
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET click_count_30d = EXCLUDED.click_count_30d,
        last_clicked_at = EXCLUDED.last_clicked_at;

  DELETE FROM public.search_result_quality srq
  WHERE NOT EXISTS (
    SELECT 1 FROM public.search_interactions si
    WHERE si.entity_type = srq.entity_type
      AND si.entity_id   = srq.entity_id
      AND si.created_at >= now() - interval '30 days'
  );

  DELETE FROM public.search_interactions
  WHERE created_at < now() - interval '90 days';

  -- Six months of "what were people looking for" is enough to spot a gap and
  -- act on it. Past that it is a record of what students typed that serves
  -- nobody.
  DELETE FROM public.search_analytics
  WHERE last_searched_at < now() - interval '180 days';
END;
$$;

REVOKE ALL ON FUNCTION public.aggregate_search_quality()
  FROM PUBLIC, anon, authenticated;
