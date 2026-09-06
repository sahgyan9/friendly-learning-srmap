-- =============================================================================
-- Migration: 20260906210000_app_downloads_tracking.sql
--
-- App Downloads & Install Telemetry:
-- Tracks downloads and installations of companion apps/tools (starting with Oberleaf).
-- Supports web button clicks, PowerShell script executions, and CLI setups.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.app_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text NOT NULL DEFAULT 'oberleaf',
  download_type text NOT NULL,
  platform text NOT NULL DEFAULT 'windows',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_downloads_app_created ON public.app_downloads (app_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_downloads_type ON public.app_downloads (download_type);

-- RLS: Only allow operations through secure RPCs
ALTER TABLE public.app_downloads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_downloads FROM PUBLIC, anon, authenticated;

-- RPC for recording an app download / install
CREATE OR REPLACE FUNCTION public.record_app_download(
  p_app_name text DEFAULT 'oberleaf',
  p_download_type text DEFAULT 'setup_bat',
  p_platform text DEFAULT 'windows'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_app text := COALESCE(NULLIF(trim(p_app_name), ''), 'oberleaf');
  v_count integer;
BEGIN
  INSERT INTO public.app_downloads (app_name, download_type, platform, user_id)
  VALUES (
    v_app,
    COALESCE(NULLIF(trim(p_download_type), ''), 'setup_bat'),
    COALESCE(NULLIF(trim(p_platform), ''), 'windows'),
    auth.uid()
  );

  SELECT count(*)::integer INTO v_count
  FROM public.app_downloads
  WHERE app_name = v_app;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.record_app_download(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_app_download(text, text, text) TO anon, authenticated, service_role;

-- RPC for getting public download statistics for an app
CREATE OR REPLACE FUNCTION public.get_app_download_stats(p_app_name text DEFAULT 'oberleaf')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_app text := COALESCE(NULLIF(trim(p_app_name), ''), 'oberleaf');
  v_total integer;
  v_7d integer;
  v_30d integer;
  v_by_type jsonb;
BEGIN
  SELECT count(*)::integer INTO v_total
  FROM public.app_downloads
  WHERE app_name = v_app;

  SELECT count(*)::integer INTO v_7d
  FROM public.app_downloads
  WHERE app_name = v_app AND created_at > now() - interval '7 days';

  SELECT count(*)::integer INTO v_30d
  FROM public.app_downloads
  WHERE app_name = v_app AND created_at > now() - interval '30 days';

  SELECT jsonb_object_agg(download_type, cnt) INTO v_by_type
  FROM (
    SELECT download_type, count(*)::integer as cnt
    FROM public.app_downloads
    WHERE app_name = v_app
    GROUP BY download_type
  ) sub;

  RETURN jsonb_build_object(
    'app_name', v_app,
    'total_downloads', v_total,
    'downloads_7d', v_7d,
    'downloads_30d', v_30d,
    'by_type', COALESCE(v_by_type, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_app_download_stats(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_download_stats(text) TO anon, authenticated, service_role;

-- Update admin_kpi_metrics() to include Oberleaf downloads
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
                                  WHERE c.last_updated > now() - interval '7 days'
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

    'oberleaf_downloads_total', (SELECT count(*) FROM public.app_downloads WHERE app_name = 'oberleaf'),
    'oberleaf_downloads_7d',    (SELECT count(*) FROM public.app_downloads WHERE app_name = 'oberleaf' AND created_at > now() - interval '7 days'),

    'generated_at', now()
  ) INTO result;

  RETURN result;
END; $fn$;

REVOKE ALL ON FUNCTION public.admin_kpi_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_kpi_metrics() TO authenticated, service_role;
