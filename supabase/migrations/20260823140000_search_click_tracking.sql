-- =============================================================================
-- Click-through feedback loop: create it for real.
--
-- 20260816100000_search_interactions.sql has been in the repo since
-- 2026-08-16 but was never applied to the database. Verified against
-- production on 2026-08-23: `search_interactions` and `search_result_quality`
-- both return `42P01 relation does not exist`, and `log_search_click` returns
-- `PGRST202 ... not found in the schema cache`.
--
-- Nothing surfaced it because both ends swallow the failure. The read path,
-- loadSearchQuality() in src/hooks/useSearchResults.ts, catches the error and
-- sets `qualityCache = {}`; the write path in GoogleResultCard.tsx is
-- fire-and-forget. So the quality term in ranking has been silently 0 for
-- every result since the feature "shipped", and no clicks were being recorded
-- to build it from either. The frontend wiring itself is correct and needs no
-- change — GoogleResultCard.tsx:147 already calls the RPC on every card click.
--
-- This file supersedes 20260816100000. Everything here is idempotent, so it is
-- safe against a database where that file did land, and safe to re-run if a
-- paste half-fails.
--
-- Differences from the original, all of which matter:
--
--   1. SECURITY DEFINER without `SET search_path` lets the caller control how
--      the function's unqualified names resolve. Both functions now pin it,
--      matching search_knowledge() and every other definer function here.
--   2. Supabase's default privileges grant ALL on new tables to anon and
--      authenticated — the defect 20260821230000_grant_audit_fix.sql had to
--      fix across ~30 existing tables. Both tables are revoked and re-granted
--      to exactly what they need, so this one does not join that list.
--   3. `aggregate_search_quality` was left callable by anon. It is a nightly
--      maintenance job, not an API.
--   4. Raw click counts are trivially inflatable by the person who benefits
--      from them — this table decides search ranking, and a mentor can click
--      their own card. The roll-up now counts distinct clickers, not rows.
--   5. `search_interactions` had no index and no retention, while the nightly
--      roll-up scans 30 days of it and the NOT EXISTS probe scans it again
--      per aggregated row.
--   6. The old roll-up zeroed stale rows instead of removing them, so
--      `search_result_quality` would grow without bound — and the client
--      reads that whole table on every search, with no filter and no limit.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. search_interactions — one row per click.
--
-- The query is stored as an md5 of its normalised text, never as the text
-- itself: ranking only needs to know that two clicks came from the same
-- search, and a campus search box collects things students would not want
-- kept ("who can help me with a backlog").
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_interactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64)  NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id  VARCHAR(255) NOT NULL,
  viewer_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Serves the 30-day roll-up scan.
CREATE INDEX IF NOT EXISTS idx_search_interactions_created_at
  ON public.search_interactions (created_at DESC);

-- Serves the per-entity recency probe in aggregate_search_quality().
CREATE INDEX IF NOT EXISTS idx_search_interactions_entity
  ON public.search_interactions (entity_type, entity_id, created_at DESC);

ALTER TABLE public.search_interactions ENABLE ROW LEVEL SECURITY;

-- No INSERT policy, deliberately. Every write goes through log_search_click(),
-- which is SECURITY DEFINER and therefore bypasses RLS; leaving a
-- `WITH CHECK (true)` insert policy open would let anyone POST arbitrary rows
-- straight at the table through PostgREST, which is the same abuse the
-- distinct-clicker counting below exists to blunt.
DROP POLICY IF EXISTS "Anyone can insert search interactions" ON public.search_interactions;

DROP POLICY IF EXISTS "Admins can view interactions" ON public.search_interactions;
CREATE POLICY "Admins can view interactions"
  ON public.search_interactions FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true));

REVOKE ALL ON public.search_interactions FROM PUBLIC, anon, authenticated;
-- SELECT only, and the admin policy above is what actually narrows it.
GRANT SELECT ON public.search_interactions TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. search_result_quality — the 30-day roll-up the client reads.
--
-- Read on every search by loadSearchQuality(), unfiltered and unlimited, so
-- this table is kept to only entities with a live click count.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_result_quality (
  entity_type     VARCHAR(50)  NOT NULL,
  entity_id       VARCHAR(255) NOT NULL,
  click_count_30d INT          NOT NULL DEFAULT 0,
  last_clicked_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id)
);

ALTER TABLE public.search_result_quality ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read search quality" ON public.search_result_quality;
CREATE POLICY "Anyone can read search quality"
  ON public.search_result_quality FOR SELECT
  USING (true);

REVOKE ALL ON public.search_result_quality FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.search_result_quality TO anon, authenticated;
-- Writes come only from aggregate_search_quality(), which runs as owner.

-- -----------------------------------------------------------------------------
-- 3. log_search_click — the one deliberate API here.
--
-- Callable by anon on purpose: most search traffic is signed out, and a
-- feedback loop that only hears from logged-in students would learn the wrong
-- thing. The abuse this opens is handled where it belongs, in the roll-up.
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
  -- Ignore junk rather than recording it: the client already gates on length
  -- >= 3, but this is the public entry point and should not depend on that.
  IF p_query IS NULL OR length(trim(p_query)) < 3
     OR p_entity_type IS NULL OR p_entity_id IS NULL THEN
    RETURN;
  END IF;

  -- Normalise before hashing (trim, lowercase, collapse whitespace) so
  -- "Machine  Learning" and "machine learning" are one search, not two.
  v_query_hash := md5(regexp_replace(lower(trim(p_query)), '\s+', ' ', 'g'));

  INSERT INTO public.search_interactions (query_hash, entity_type, entity_id, viewer_id)
  VALUES (v_query_hash, left(p_entity_type, 50), left(p_entity_id, 255), auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.log_search_click(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_search_click(TEXT, TEXT, TEXT)
  TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. aggregate_search_quality — nightly roll-up.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aggregate_search_quality()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- One clicker, one vote.
  --
  -- Counting raw rows would let a mentor raise their own ranking by clicking
  -- their own card in a loop, which is the whole reason this table is worth
  -- attacking. Signed-in clicks collapse per person; signed-out clicks
  -- collapse per distinct search, so inflating anonymously means inventing
  -- distinct queries that all rank the target, which is the behaviour the
  -- signal is supposed to reward anyway.
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

  -- Drop entities with no click in the window instead of zeroing them. The
  -- original left a permanent row per entity ever clicked, and the client
  -- fetches this table in full on every search — PostgREST caps that at 1000
  -- rows, so unbounded growth would eventually start silently truncating the
  -- signal rather than just wasting bytes.
  DELETE FROM public.search_result_quality srq
  WHERE NOT EXISTS (
    SELECT 1 FROM public.search_interactions si
    WHERE si.entity_type = srq.entity_type
      AND si.entity_id   = srq.entity_id
      AND si.created_at >= now() - interval '30 days'
  );

  -- Retention. Nothing reads past 30 days, and these rows tie a person to the
  -- searches they ran; keeping them for a year would be collecting a browsing
  -- history nobody asked for. 90 days leaves room to widen the window later.
  DELETE FROM public.search_interactions
  WHERE created_at < now() - interval '90 days';
END;
$$;

REVOKE ALL ON FUNCTION public.aggregate_search_quality()
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Nightly schedule, 02:00 — well clear of sync-faculty (03:00) and the
--    monthly alumni prompt (04:00).
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'aggregate-search-quality-nightly') THEN
    PERFORM cron.schedule(
      'aggregate-search-quality-nightly',
      '0 2 * * *',
      $cron$ SELECT public.aggregate_search_quality(); $cron$
    );
  END IF;
END $$;

-- Populate immediately so the table is not empty until 02:00. A no-op on a
-- fresh install; on a re-run it just rebuilds from whatever clicks exist.
SELECT public.aggregate_search_quality();
