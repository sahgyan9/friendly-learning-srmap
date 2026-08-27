-- PWA installs tracking table + RPC and updated admin_kpi_metrics()
-- Records client device installs, platforms, and standalone active usage.

CREATE TABLE IF NOT EXISTS public.pwa_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  platform text NOT NULL,
  installed_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on pwa_installs
ALTER TABLE public.pwa_installs ENABLE ROW LEVEL SECURITY;

-- Deny raw direct select/insert to anon/authenticated; reads and writes go through RPCs
REVOKE ALL ON TABLE public.pwa_installs FROM PUBLIC, anon, authenticated;

-- RPC for recording an install or standalone launch
CREATE OR REPLACE FUNCTION public.record_pwa_install(
  p_device_id text,
  p_platform text,
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
BEGIN
  IF p_device_id IS NULL OR trim(p_device_id) = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.pwa_installs (device_id, user_id, platform, installed_at, last_seen_at)
  VALUES (p_device_id, v_uid, p_platform, now(), now())
  ON CONFLICT (device_id) DO UPDATE
  SET last_seen_at = now(),
      user_id = COALESCE(EXCLUDED.user_id, public.pwa_installs.user_id);
END; $fn$;

REVOKE ALL ON FUNCTION public.record_pwa_install(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_pwa_install(text, text, uuid) TO anon, authenticated, service_role;

-- Updated admin_kpi_metrics RPC with PWA install statistics
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

    'pwa_installs_total', (SELECT count(*) FROM public.pwa_installs),
    'pwa_installs_7d',    (SELECT count(*) FROM public.pwa_installs
                           WHERE installed_at > now() - interval '7 days'),
    'pwa_active_7d',      (SELECT count(*) FROM public.pwa_installs
                           WHERE last_seen_at > now() - interval '7 days'),

    'generated_at', now()
  ) INTO result;

  RETURN result;
END; $fn$;

REVOKE ALL ON FUNCTION public.admin_kpi_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_kpi_metrics() TO authenticated, service_role;

