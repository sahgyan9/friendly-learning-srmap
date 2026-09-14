-- =============================================================================
-- Restore public.get_related_searches.
--
-- Found 2026-09-14: production has no get_related_searches (PostgREST
-- PGRST202, absent from generated types, no pg_proc row), although
-- 20260817100000_dynamic_related_searches.sql defines it. The "Related
-- searches" strip in src/integrations/supabase/services/related-searches.ts
-- calls it and has been getting an error on every search.
--
-- Same behaviour as 20260817100000, with two hardening changes:
--   - SET search_path, which the original SECURITY DEFINER function lacked
--     (an unpinned search_path on a definer function lets a caller's objects
--     shadow the ones it means to use).
--   - pgvector's type and operator are schema-qualified to `extensions`,
--     where this project installs the extension (knowledge_chunks uses
--     extensions.vector(768)), instead of relying on the caller's path.
--
-- Deliberately public: it returns only cached query text, never who searched.
-- REVOKE FROM PUBLIC first, then GRANT to the two API roles, so the grant is
-- explicit rather than inherited.
--
-- Uses pgvector, so it cannot run in the PGlite harness; see the SKIP list in
-- supabase/tests/verify-migrations.mjs.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_related_searches(
  p_query text,
  p_limit int DEFAULT 6
)
RETURNS TABLE (
  query_text text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_query_hash text;
  v_embedding extensions.vector(768);
BEGIN
  v_query_hash := md5(regexp_replace(lower(trim(p_query)), '\s+', ' ', 'g'));

  -- The cached embedding may be stored as a vector or as JSON text depending
  -- on which writer produced it; cast through text either way.
  BEGIN
    SELECT (sqc.embedding::text)::extensions.vector INTO v_embedding
    FROM public.search_query_cache sqc
    WHERE sqc.query_hash = v_query_hash;
  EXCEPTION WHEN others THEN
    v_embedding := NULL;
  END;

  -- A query that has not been through semantic-search yet has no embedding:
  -- fall back to what is popular.
  IF v_embedding IS NULL THEN
    RETURN QUERY
    SELECT sqc.query_text
    FROM public.search_query_cache sqc
    WHERE sqc.query_hash != v_query_hash
      AND sqc.hit_count > 1
      AND length(sqc.query_text) > 3
      AND length(sqc.query_text) < 50
    ORDER BY sqc.hit_count DESC, sqc.last_used_at DESC
    LIMIT p_limit;
    RETURN;
  END IF;

  -- Cosine distance < 0.25, i.e. similarity > 0.75.
  RETURN QUERY
  SELECT sqc.query_text
  FROM public.search_query_cache sqc
  WHERE sqc.query_hash != v_query_hash
    AND sqc.embedding IS NOT NULL
    AND sqc.hit_count > 1
    AND length(sqc.query_text) > 3
    AND length(sqc.query_text) < 50
    AND (sqc.embedding::text)::extensions.vector OPERATOR(extensions.<=>) v_embedding < 0.25
  ORDER BY
    (sqc.embedding::text)::extensions.vector OPERATOR(extensions.<=>) v_embedding ASC,
    sqc.hit_count DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_related_searches(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_related_searches(text, int) TO anon, authenticated;
