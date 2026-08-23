-- =============================================================================
-- Faculty column grants: office_location, research_details
--
-- `public.faculty` uses column-level SELECT for `anon` (email deliberately
-- withheld -- see 20260806100000, 20260821230000). `office_location` and
-- `research_details` are real, live columns on the table -- added by hand
-- (via enrich_all_faculty_to_supabase.mjs / the Supabase dashboard, the same
-- "dashboard-origin" pattern documented for other tables in
-- supabase/tests/verify-migrations.mjs) -- but no migration in this repo ever
-- created them, so no migration ever granted anon SELECT on them either.
--
-- src/integrations/supabase/services/faculty.ts's FACULTY_COLUMNS names both
-- columns in every faculty read (getFacultyList, getFacultyBySlug,
-- getSimilarFaculty). Column grants do not extend to columns a table-level
-- REVOKE + column re-grant list forgot -- confirmed live on 2026-08-23 via the
-- REST API with the anon key: `select=id,office_location,research_details`
-- returns `42501 permission denied for table faculty`; dropping those two
-- names from the select list succeeds. This is the same class of incident as
-- 2026-08-06 (interests/research_areas), just never caught for these two
-- columns because 20260821230000's REVOKE ALL + re-grant carried forward the
-- same omission instead of introducing it.
--
-- `email` is a separate, unrelated 42501 on the same table (deliberately
-- withheld from anon) -- fixed on the client side (faculty.ts), not here. Do
-- not grant email to anon.
--
-- ADD COLUMN IF NOT EXISTS below is not defensive filler: these columns exist
-- on the live database (verified via the REST API 2026-08-23) but were never
-- created by any migration, so a fresh install replaying this file from an
-- empty database would otherwise fail with "column does not exist" before
-- ever reaching the GRANT. Same reasoning as `has_image`/`interests` in
-- 20260821150000/20260806100000.
-- =============================================================================

ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS office_location TEXT;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS research_details TEXT[];

GRANT SELECT (office_location, research_details) ON public.faculty TO anon;

-- authenticated already holds table-level SELECT (20260821230000), so this is
-- redundant there -- granted anyway so this migration is self-sufficient on a
-- database where that table-level grant was never made, matching the pattern
-- in 20260806100000.
GRANT SELECT (office_location, research_details) ON public.faculty TO authenticated;
