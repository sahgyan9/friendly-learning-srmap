-- =============================================================================
-- Fix over-broad grants on knowledge_articles
--
-- 20260821210000_knowledge_articles.sql's GRANT statements only added
-- privileges — they never revoked Supabase's default
-- `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,
-- authenticated`, which every new table in this project arrives with (see
-- communities/community_members et al., documented separately). Verified live
-- on 2026-08-21: anon held INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER
-- on knowledge_articles alongside SELECT.
--
-- RLS was never bypassed by this — every write policy is scoped `TO
-- authenticated`, so anon never matched a permissive policy regardless of its
-- table-level grants — but RLS should not be the only thing narrowing this,
-- per this repo's own rule. Revoke everything and re-grant only the intended
-- set.
-- =============================================================================

REVOKE ALL ON public.knowledge_articles FROM anon, authenticated;

GRANT SELECT ON public.knowledge_articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.knowledge_articles TO authenticated;
GRANT ALL ON public.knowledge_articles TO service_role;
