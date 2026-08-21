-- =============================================================================
-- Grant audit fix, part 2: tables the PGlite test harness cannot construct
--
-- Same defect and same audit as 20260821230000_grant_audit_fix.sql — read that
-- file's header first. This part covers the subset of over-granted tables
-- that predate migration tracking (created by hand in the Supabase Studio
-- table editor) or were otherwise never added to verify-migrations.mjs's
-- executed list, so an empty PGlite database has no way to replay them from
-- scratch. This is the same limitation verify-migrations.mjs already
-- documents for 29 other files (search SKIPPED, group 3). This migration is
-- listed there too, with this same reasoning, instead of being silently
-- absent from the test run.
--
-- Verified against production directly instead: this SQL was applied via the
-- Supabase SQL editor and information_schema.table_privileges was re-queried
-- afterward to confirm each table now holds exactly the grants listed below.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Admin-only tables. Writes go through SECURITY DEFINER functions
-- (log_admin_action, promote_to_admin_with_code) that bypass grants entirely;
-- anon gets nothing.
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;

REVOKE ALL ON public.admin_recovery FROM anon, authenticated;
GRANT SELECT, INSERT ON public.admin_recovery TO authenticated;

-- -----------------------------------------------------------------------------
-- Authenticated-only, auth.uid()-keyed RLS (same reasoning as conversations/
-- messages in part 1 — anon's auth.uid() is null, so no policy ever matches).
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.ai_conversations FROM anon, authenticated;
GRANT SELECT, INSERT ON public.ai_conversations TO authenticated;

REVOKE ALL ON public.typing_indicators FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_indicators TO authenticated;

REVOKE ALL ON public.user_presence FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_presence TO authenticated;

-- team_members holds staff email addresses; admin-gated SELECT and write
-- policies, no anon use.
REVOKE ALL ON public.team_members FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;

-- -----------------------------------------------------------------------------
-- Public contact form. Anon needs INSERT only — "Anyone can create contact
-- messages" WITH CHECK (true), no TO clause. SELECT/UPDATE are admin-gated.
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.contact_messages FROM anon, authenticated;
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE ON public.contact_messages TO authenticated;

REVOKE ALL ON public.contact_responses FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contact_responses TO authenticated;

-- -----------------------------------------------------------------------------
-- Views (security_invoker = true, so the underlying tables' RLS still
-- applies). A single-table view with no aggregation is auto-updatable by
-- Postgres by default, so a leftover default INSERT/UPDATE/DELETE grant here
-- is a real writable-view exposure, not a theoretical one.
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.users_public FROM anon, authenticated;
GRANT SELECT ON public.users_public TO anon, authenticated;

REVOKE ALL ON public.team_members_public FROM anon, authenticated;
GRANT SELECT ON public.team_members_public TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC-only tables: same shape as community_channels (20260807140000) — every
-- read and write goes through a SECURITY DEFINER function
-- (invite_to_community, respond_to_invite, request_to_join_community,
-- decide_join_request, toggle_group_message_reaction), which bypasses table
-- grants entirely. Direct-access RLS policies exist on these tables but
-- nothing in the app calls the tables directly, so nothing is granted.
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.community_invites FROM anon, authenticated;
REVOKE ALL ON public.community_join_requests FROM anon, authenticated;
REVOKE ALL ON public.community_group_message_reactions FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- canvas_drawings / canvas_participants / canvas_sessions: the canvas feature
-- was removed in 20260820130000_drop_legacy_canvas_tables.sql, but as of this
-- audit (2026-08-21) that migration has not reached production yet — these
-- tables still exist live with full default grants. Revoked defensively with
-- no re-grant regardless of when the drop lands: if it runs later this is a
-- no-op, and if it's delayed the tables aren't wide open with full CRUD to
-- anon in the meantime.
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.canvas_drawings FROM anon, authenticated;
REVOKE ALL ON public.canvas_participants FROM anon, authenticated;
REVOKE ALL ON public.canvas_sessions FROM anon, authenticated;
