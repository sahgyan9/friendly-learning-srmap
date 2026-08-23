-- Migration: 20260823090000_trending_searches.sql
-- Description: Real "trending searches" for the landing page and navbar search,
-- sourced from search_query_cache (every semantic query already flows through
-- there via semantic-search's upsert + touch_search_cache hit counter). No new
-- table needed — this just exposes an aggregate, non-PII view of it (query text
-- + how many times it's been searched recently), the same way
-- get_related_searches already does for its cold-start fallback.

CREATE OR REPLACE FUNCTION public.get_trending_searches(p_limit int DEFAULT 6)
RETURNS TABLE (
  query_text text,
  hit_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sqc.query_text, sqc.hit_count
  FROM public.search_query_cache sqc
  WHERE sqc.hit_count > 1
    AND length(sqc.query_text) > 3
    AND length(sqc.query_text) < 60
    -- Recent only, so a one-off spike from weeks ago doesn't calcify into a
    -- permanent "trend" once fresher queries stop accumulating hits.
    AND sqc.last_used_at > now() - interval '14 days'
  ORDER BY sqc.hit_count DESC, sqc.last_used_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 20);
$$;

-- Aggregate counts of what's being searched, not who searched it — same
-- public-by-design reasoning as get_related_searches and semantic-search
-- itself (verify_jwt = false covers the latter; this RPC is plain SQL callable
-- by anyone).
REVOKE ALL ON FUNCTION public.get_trending_searches(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trending_searches(int) TO anon, authenticated;
