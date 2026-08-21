-- =============================================================================
-- Grant audit fix, part 1: tables reconstructible in the PGlite test harness
--
-- Same defect as 20260821220000_knowledge_articles_grants_fix.sql, found while
-- auditing whether it was isolated to one table. It was not: Supabase's
-- `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,
-- authenticated` has applied to nearly every table ever created in this
-- project, and almost none of them ever revoked it. Verified live on
-- 2026-08-21 via information_schema.table_privileges: every table below held
-- the full default set (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/
-- TRIGGER) for both anon and authenticated, regardless of what its RLS
-- policies actually intend.
--
-- 20260807140000_community_channels.sql already flagged this exact pattern on
-- 2026-08-07 ("every existing community table carries all seven privileges
-- for anon") but only fixed community_channels itself. This migration is the
-- follow-through on that comment, plus every other table with the same gap.
--
-- RLS is very likely the reason nothing has gone wrong: most write policies
-- here are scoped `TO authenticated`, so anon never matched a permissive
-- policy regardless of its table-level grants. This is defense-in-depth, not
-- an incident response.
--
-- Part 2 (20260821240000) covers the tables this harness cannot construct
-- from scratch (dashboard-origin, predating migration tracking) — see that
-- file and its SKIPPED-section entry in verify-migrations.mjs.
--
-- mentor_reviews and mentor_verifications were missing from the first draft
-- of this audit's candidate list (a transcription slip, not a deliberate
-- exclusion) and were caught afterward by re-querying
-- information_schema.table_privileges for leftover TRUNCATE/REFERENCES/
-- TRIGGER grants post-fix. Their policies live only in the database (dashboard
-- -origin, like part 2's tables) but the tables themselves are reconstructible
-- here, so they're fixed in this file, not part 2.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- faculty: REGRESSION, not just hygiene.
--
-- 20260804132345 deliberately revoked anon's table-level SELECT and replaced
-- it with column-level SELECT withholding `email`, documented again in
-- 20260806100000 ("do not fix that"). No migration in this repo ever restored
-- anon's table-level SELECT — but the live grant dump on 2026-08-21 showed
-- anon holding full table-level SELECT (all columns) regardless, meaning
-- `email` is exposed to anonymous visitors right now. Re-applying the
-- documented column list closes it; the column list itself is unchanged from
-- what 20260804132345 + 20260806100000 + 20260821150000 already granted.
--
-- authenticated is intentionally NOT column-restricted (see 20260806100000
-- line ~102: "authenticated holds a table-level SELECT, so it needs nothing
-- here") — logged-in students seeing faculty email is the intended design.
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.faculty FROM anon, authenticated;

GRANT SELECT (id, name, designation, department, school, profile_image, avg_rating,
              rating_count, created_at, updated_at, slug, profile_url, image_url, source,
              is_active, avg_overall, avg_teaching, avg_grading, avg_helpfulness, last_synced_at,
              interests, research_areas, interests_text, has_image)
  ON public.faculty TO anon;
GRANT SELECT ON public.faculty TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faculty TO authenticated;

REVOKE ALL ON public.faculty_ratings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_ratings TO authenticated;

REVOKE ALL ON public.faculty_review_votes FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.faculty_review_votes TO authenticated;

-- mentor_reviews: "Anyone can view mentor reviews" is qual(true) -- a genuine
-- public SELECT policy, unlike the auth.uid()-keyed write policies below it.
REVOKE ALL ON public.mentor_reviews FROM anon, authenticated;
GRANT SELECT ON public.mentor_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mentor_reviews TO authenticated;

-- mentor_verifications: every policy is keyed on auth.uid() or is_admin, so
-- anon never has a legitimate use for it -- verified via pg_policies live,
-- since this table predates migration tracking.
REVOKE ALL ON public.mentor_verifications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_verifications TO authenticated;

-- -----------------------------------------------------------------------------
-- mentors / marketplace_posts: already correctly column-restricted for anon
-- (their REVOKE SELECT + column GRANT in 20260804132345/20260804132512 is
-- intact live). Only the leftover default write privileges need to go.
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.mentors FROM anon, authenticated;
GRANT SELECT (id, name, department, skills, rating, profile_image, linkedin_url, bio,
              review_count, created_at, year_of_studies, university, graduation_year,
              is_alumni, company, job_title, is_available, available_from, availability_note,
              hobbies, projects, experiences, courses)
  ON public.mentors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentors TO authenticated;

REVOKE ALL ON public.marketplace_posts FROM anon, authenticated;
GRANT SELECT (id, title, description, category, date, author, image_url, external_link,
              created_at, updated_at, user_id)
  ON public.marketplace_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_posts TO authenticated;

-- -----------------------------------------------------------------------------
-- Public read-only reference tables.
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.academic_calendar_days FROM anon, authenticated;
GRANT SELECT ON public.academic_calendar_days TO anon, authenticated;

REVOKE ALL ON public.campus_documents FROM anon, authenticated;
GRANT SELECT ON public.campus_documents TO anon, authenticated;

REVOKE ALL ON public.srmap_events_cache FROM anon, authenticated;
GRANT SELECT ON public.srmap_events_cache TO anon, authenticated;

REVOKE ALL ON public.badge_types FROM anon, authenticated;
GRANT SELECT ON public.badge_types TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.badge_types TO authenticated;

-- -----------------------------------------------------------------------------
-- Public read, authenticated-gated write.
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.campus_notices FROM anon, authenticated;
GRANT SELECT ON public.campus_notices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campus_notices TO authenticated;

REVOKE ALL ON public.platform_settings FROM anon, authenticated;
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT UPDATE ON public.platform_settings TO authenticated;

REVOKE ALL ON public.opportunities FROM anon, authenticated;
GRANT SELECT ON public.opportunities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;

REVOKE ALL ON public.opportunity_teams FROM anon, authenticated;
GRANT SELECT ON public.opportunity_teams TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.opportunity_teams TO authenticated;

REVOKE ALL ON public.communities FROM anon, authenticated;
GRANT SELECT ON public.communities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.communities TO authenticated;

REVOKE ALL ON public.community_posts FROM anon, authenticated;
GRANT SELECT ON public.community_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;

REVOKE ALL ON public.community_group_messages FROM anon, authenticated;
GRANT SELECT ON public.community_group_messages TO anon, authenticated;

REVOKE ALL ON public.post_comments FROM anon, authenticated;
GRANT SELECT ON public.post_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;

REVOKE ALL ON public.post_likes FROM anon, authenticated;
GRANT SELECT ON public.post_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.post_likes TO authenticated;

REVOKE ALL ON public.user_badges FROM anon, authenticated;
GRANT SELECT ON public.user_badges TO anon, authenticated;
GRANT INSERT, UPDATE ON public.user_badges TO authenticated;

-- -----------------------------------------------------------------------------
-- Anon-only insert (public forms with no matching SELECT policy for anon).
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.ai_overview_feedback FROM anon, authenticated;
GRANT INSERT ON public.ai_overview_feedback TO anon, authenticated;
GRANT SELECT, UPDATE ON public.ai_overview_feedback TO authenticated;

-- -----------------------------------------------------------------------------
-- Authenticated-only (RLS keys every policy off auth.uid(), which is null for
-- anon, so anon never has a legitimate use for any of these).
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.opportunity_interest FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_interest TO authenticated;

-- Reads go through get_community_members/list_communities (SECURITY DEFINER);
-- no SELECT policy exists for direct table access, so none is granted.
REVOKE ALL ON public.community_members FROM anon, authenticated;
GRANT INSERT, DELETE ON public.community_members TO authenticated;

REVOKE ALL ON public.conversations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;

REVOKE ALL ON public.messages FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;

REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;

REVOKE ALL ON public.certificates FROM anon, authenticated;
GRANT SELECT ON public.certificates TO authenticated;

REVOKE ALL ON public.users FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- email_queue: RLS enabled with zero policies for any role — intentional
-- default-deny. Writes are trigger-driven, drains via a scheduled function;
-- both run as service_role, which bypasses RLS and grants entirely. Nothing
-- is re-granted here.
REVOKE ALL ON public.email_queue FROM anon, authenticated;

-- knowledge_chunks: anon was already correctly revoked in 20260806160000.
-- authenticated's default grant was never touched — its sole policy is an
-- admin-gated SELECT.
REVOKE ALL ON public.knowledge_chunks FROM authenticated;
GRANT SELECT ON public.knowledge_chunks TO authenticated;
