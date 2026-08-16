-- Migration: 20260817110000_freshness_ranking.sql
-- Description: Phase 6 - Freshness-Aware Opportunity Ranking

-- A stable function that takes a table row and returns a boolean.
-- PostgREST automatically exposes this as a computed column, allowing us to
-- select `is_fresh` and sort by `is_fresh DESC` without adding a trigger
-- or physically storing mutable state on the table.
CREATE OR REPLACE FUNCTION public.is_fresh(o public.opportunities)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  -- Opportunities created within the last 3 days get the "fresh" status.
  SELECT o.created_at >= (now() - interval '3 days');
$$;

-- Grant access so anyone who can read opportunities can evaluate this computed column
GRANT EXECUTE ON FUNCTION public.is_fresh(public.opportunities) TO anon, authenticated;
