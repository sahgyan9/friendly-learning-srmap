-- =============================================================================
-- Ensure office_location and research_details exist and grant SELECT to anon.
--
-- 20260821230000_grant_audit_fix.sql narrowed anon's access on public.faculty to
-- column-level SELECT (withholding email for anti-scraping reasons). When
-- office_location and research_details were added to queries, anon users
-- received 42501 permission denied errors because SELECT was not granted on
-- those columns.
--
-- This migration ensures the columns exist and grants SELECT to anon.
-- Email remains deliberately withheld from anon.
-- =============================================================================

ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS office_location TEXT;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS research_details TEXT[];

GRANT SELECT (office_location, research_details) ON public.faculty TO anon;
