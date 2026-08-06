-- =============================================================================
-- Faculty research interests
--
-- The faculty directory knew a professor's name, designation and department and
-- nothing about what they actually work on, so there was no way to answer the
-- question students actually ask ("who could supervise a project on X?").
--
-- SRM University-AP's own WordPress directory already carries this: the
-- `interest` taxonomy is attached to 590 of 629 published profiles (94%), median
-- 3 terms each, 1384 distinct terms. The `department-research-area` taxonomy
-- covers a further 74 profiles. Both are public, both already travel in the same
-- REST response the sync-faculty function pulls every month, and both were being
-- discarded. This migration gives them somewhere to land.
--
-- The terms are author-entered free text, not a controlled vocabulary. Expect
-- "Artificial Intelligence" alongside "1. Advanced Functional Materials for
-- Defence Sensors". That rules them out as a tidy filter dropdown but makes them
-- excellent matching material, which is what they are used for.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Columns
-- -----------------------------------------------------------------------------
ALTER TABLE public.faculty
  ADD COLUMN IF NOT EXISTS interests TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.faculty
  ADD COLUMN IF NOT EXISTS research_areas TEXT[] NOT NULL DEFAULT '{}';

-- Flattened copy of the two arrays above, so the existing directory search can
-- add one more ILIKE term instead of growing a second code path. PostgREST has
-- no operator for "ILIKE any element of a text[]", and the client builds its
-- search with .or(...), so the searchable form has to be a plain TEXT column.
--
-- NOT a GENERATED column: array_to_string is marked STABLE (provolatile 's'),
-- not IMMUTABLE, and Postgres rejects a stored generated column whose expression
-- is not immutable. Maintained by trigger instead — same effect, one more moving
-- part.
ALTER TABLE public.faculty
  ADD COLUMN IF NOT EXISTS interests_text TEXT NOT NULL DEFAULT '';

-- -----------------------------------------------------------------------------
-- Keep interests_text in step with the arrays
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.faculty_sync_interests_text()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- ' | ' rather than ' ' so a search for "materials design" cannot match across
  -- the boundary between two unrelated interests.
  NEW.interests_text := array_to_string(
    COALESCE(NEW.interests, '{}') || COALESCE(NEW.research_areas, '{}'),
    ' | '
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_faculty_interests_text ON public.faculty;
CREATE TRIGGER trg_faculty_interests_text
  BEFORE INSERT OR UPDATE OF interests, research_areas ON public.faculty
  FOR EACH ROW EXECUTE FUNCTION public.faculty_sync_interests_text();

-- Backfill. A no-op on a fresh database (both arrays default to '{}'), and the
-- correct repair on any database where the columns were added by an earlier
-- partial run of this file.
UPDATE public.faculty
SET interests_text = array_to_string(
      COALESCE(interests, '{}') || COALESCE(research_areas, '{}'),
      ' | '
    )
WHERE interests_text IS DISTINCT FROM array_to_string(
        COALESCE(interests, '{}') || COALESCE(research_areas, '{}'),
        ' | '
      );

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
-- GIN over the array supports exact-tag browsing (`interests @> ARRAY['...']`),
-- which is how a chip on a profile links through to "everyone else who lists
-- this". No index on interests_text: it is only ever queried with a leading
-- wildcard, which no btree can serve, and the directory is ~620 rows — the same
-- reasoning that kept pg_trgm out of the original faculty migration.
CREATE INDEX IF NOT EXISTS idx_faculty_interests
  ON public.faculty USING GIN (interests);

-- -----------------------------------------------------------------------------
-- Facets
--
-- The 1384 distinct terms are mostly used once, so a full list is useless as a
-- browse UI. This returns the terms that are actually shared between faculty,
-- which is the only part worth surfacing as clickable chips.
--
-- Plain SECURITY INVOKER: public.faculty already has a public SELECT policy (the
-- directory is prerendered for search engines), so there is nothing here a
-- caller could not read directly. No reason to reach for DEFINER.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_faculty_interest_facets(p_limit INTEGER DEFAULT 40)
RETURNS TABLE (interest TEXT, faculty_count BIGINT)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT t.interest, COUNT(*) AS faculty_count
  FROM public.faculty f
  CROSS JOIN LATERAL unnest(f.interests) AS t(interest)
  WHERE f.is_active
  GROUP BY t.interest
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC, t.interest ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 200));
$$;

-- Postgres grants EXECUTE to PUBLIC on every new function, and PostgREST exposes
-- everything in `public`. Revoke from PUBLIC (not from anon — that is a no-op
-- while the PUBLIC grant stands) and re-grant deliberately. Same rule as
-- 20260804170000_lock_down_anon_rpc_surface.sql.
REVOKE ALL ON FUNCTION public.get_faculty_interest_facets(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_faculty_interest_facets(INTEGER) TO anon, authenticated;

-- The trigger helper is not an API. Revoking PUBLIC alone is not enough here:
-- Supabase ships ALTER DEFAULT PRIVILEGES granting EXECUTE on new functions in
-- `public` to anon and authenticated, so those are separate grants that survive
-- a PUBLIC revoke. Every other locked-down trigger helper in this database sits
-- at `postgres=X service_role=X`; match that exactly.
REVOKE ALL ON FUNCTION public.faculty_sync_interests_text() FROM PUBLIC, anon, authenticated;
