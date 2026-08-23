-- Launch KPI panel: one SECURITY DEFINER RPC, admin-gated, same shape as
-- admin_health_metrics() (20260809150000) but answering "what are people
-- doing" instead of "is anything broken" -- searches run, mentors contacted,
-- groups joined, posts made, notices published.
--
-- Deliberately reads auth.users for signup counts rather than public.users.
-- No migration in this repo ever added or referenced a created_at column on
-- public.users (it is a dashboard-origin table -- see the "LEGACY 2025-06-15"
-- note in supabase/tests/verify-migrations.mjs), so assuming one exists would
-- repeat the mistake the column-grants incident already taught this repo:
-- guessing at a live schema instead of reading it. auth.users.created_at is
-- guaranteed by Supabase Auth itself, so it carries no such risk.
--
-- Deliberately does NOT report a "searches in the last 7 days" volume number.
-- search_analytics (20260823150000) stores one row per distinct query with a
-- running search_count and a single last_searched_at -- it cannot say how
-- many of those searches happened in the last week, only whether the query
-- was searched at all recently. Reporting sum(search_count) filtered by
-- last_searched_at would silently attribute a query's entire history to
-- "this week" the moment it gets searched once more. queries_active_7d
-- (distinct queries touched in the window) is the honest number that schema
-- can give.

CREATE OR REPLACE FUNCTION public.admin_kpi_metrics()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE v_is_admin boolean; result jsonb;
BEGIN
  SELECT u.is_admin INTO v_is_admin FROM public.users u WHERE u.id = auth.uid();
  IF v_is_admin IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'signups_total',   (SELECT count(*) FROM auth.users),
    'signups_7d',      (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'signups_30d',     (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days'),

    'searches_total',       (SELECT COALESCE(sum(search_count), 0) FROM public.search_analytics),
    'unique_queries_total', (SELECT count(*) FROM public.search_analytics),
    'queries_active_7d',    (SELECT count(*) FROM public.search_analytics
                              WHERE last_searched_at > now() - interval '7 days'),
    'zero_result_rate_pct', (SELECT CASE WHEN COALESCE(sum(search_count), 0) = 0 THEN 0
                                     ELSE round(100.0 * sum(zero_result_count) / sum(search_count), 1)
                                     END
                              FROM public.search_analytics),

    -- A conversation counts as a "mentor contact" if either side is a listed
    -- mentor. Conversations store user1_id/user2_id with no role flag (the
    -- calling convention puts the mentor in user2_id, but nothing enforces
    -- it), so both sides are checked rather than trusting call order.
    'mentor_contacts_total',    (SELECT count(*) FROM public.conversations c
                                  WHERE EXISTS (SELECT 1 FROM public.mentors m
                                                WHERE m.id IN (c.user1_id, c.user2_id))),
    'mentor_contacts_7d',       (SELECT count(*) FROM public.conversations c
                                  WHERE c.created_at > now() - interval '7 days'
                                    AND EXISTS (SELECT 1 FROM public.mentors m
                                                WHERE m.id IN (c.user1_id, c.user2_id))),
    'distinct_mentors_contacted', (SELECT count(DISTINCT m.id) FROM public.mentors m
                                    WHERE EXISTS (SELECT 1 FROM public.conversations c
                                                  WHERE m.id IN (c.user1_id, c.user2_id))),

    'group_joins_total', (SELECT count(*) FROM public.community_members),
    'group_joins_7d',    (SELECT count(*) FROM public.community_members
                           WHERE joined_at > now() - interval '7 days'),
    'active_groups',     (SELECT count(*) FROM public.communities WHERE is_archived = false),

    'posts_total', (SELECT count(*) FROM public.community_posts),
    'posts_7d',    (SELECT count(*) FROM public.community_posts
                     WHERE created_at > now() - interval '7 days'),

    'notices_published_total', (SELECT count(*) FROM public.campus_notices WHERE is_published = true),
    'notices_published_7d',    (SELECT count(*) FROM public.campus_notices
                                 WHERE is_published = true AND created_at > now() - interval '7 days'),

    'generated_at', now()
  ) INTO result;

  RETURN result;
END; $fn$;

REVOKE ALL ON FUNCTION public.admin_kpi_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_kpi_metrics() TO authenticated;
