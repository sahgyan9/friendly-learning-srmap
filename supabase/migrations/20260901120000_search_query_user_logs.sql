-- =============================================================================
-- Migration: 20260901120000_search_query_user_logs.sql
--
-- CampusBrain Search User Attribution:
-- Tracks which student made specific search queries while maintaining
-- support for anonymous/guest searches.
--
-- Exposes search logs and user identities exclusively to admins via
-- SECURITY DEFINER RPCs (adhering to the rule that public.users is owner-only).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.search_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  query_text    TEXT NOT NULL,
  query_hash    VARCHAR(32),
  result_count  INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_created_at
  ON public.search_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_logs_user_id
  ON public.search_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_logs_query_hash
  ON public.search_logs (query_hash);

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select search logs" ON public.search_logs;
CREATE POLICY "Admins can select search logs"
  ON public.search_logs FOR SELECT
  USING (public.is_admin_user(auth.uid()));

REVOKE ALL ON public.search_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.search_logs TO authenticated;

-- -----------------------------------------------------------------------------
-- log_search_run: logs both aggregate counts into search_analytics AND
-- individual search audit entries with user attribution into search_logs.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_search_run(
  p_query        TEXT,
  p_result_count INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_query_hash TEXT;
  v_text       TEXT;
  v_caller_id  UUID := auth.uid();
BEGIN
  IF p_query IS NULL OR length(trim(p_query)) < 3 THEN
    RETURN;
  END IF;

  v_text       := left(trim(p_query), 300);
  v_query_hash := md5(regexp_replace(lower(trim(p_query)), '\s+', ' ', 'g'));

  -- 1. Maintain aggregate analytics
  INSERT INTO public.search_analytics AS sa
        (query_hash, query_text, search_count, zero_result_count)
  VALUES (v_query_hash, v_text, 1, CASE WHEN COALESCE(p_result_count, 0) = 0 THEN 1 ELSE 0 END)
  ON CONFLICT (query_hash) DO UPDATE
    SET search_count      = sa.search_count + 1,
        zero_result_count = sa.zero_result_count
                            + CASE WHEN COALESCE(p_result_count, 0) = 0 THEN 1 ELSE 0 END,
        last_searched_at  = now(),
        query_text        = EXCLUDED.query_text;

  -- 2. Maintain per-event search audit logs with user attribution
  INSERT INTO public.search_logs (user_id, query_text, query_hash, result_count)
  VALUES (v_caller_id, v_text, v_query_hash, COALESCE(p_result_count, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.log_search_run(TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_search_run(TEXT, INT) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- get_admin_search_logs: Admin-only SECURITY DEFINER RPC to retrieve search logs
-- joined safely with student/mentor details.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_search_logs(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_filter TEXT DEFAULT '',
  p_user_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  query_text TEXT,
  result_count INT,
  created_at TIMESTAMPTZ,
  user_name TEXT,
  user_email TEXT,
  user_avatar TEXT,
  user_role TEXT,
  user_department TEXT,
  user_college_id TEXT,
  is_anonymous BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_trimmed TEXT := trim(coalesce(p_filter, ''));
  v_escaped TEXT := replace(replace(replace(trim(coalesce(p_filter, '')), '\', '\\'), '%', '\%'), '_', '\_');
  v_capped_limit INT := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_capped_offset INT := greatest(coalesce(p_offset, 0), 0);
BEGIN
  -- Caller must be an admin
  IF NOT public.is_admin_user(v_caller_id) THEN
    RAISE EXCEPTION 'Only admins can view search logs';
  END IF;

  RETURN QUERY
  SELECT
    sl.id,
    sl.user_id,
    sl.query_text,
    sl.result_count,
    sl.created_at,
    CASE 
      WHEN sl.user_id IS NULL THEN 'Anonymous Guest'
      ELSE coalesce(nullif(trim(m.name), ''), nullif(trim(u.name), ''), 'Student')::TEXT
    END AS user_name,
    CASE 
      WHEN sl.user_id IS NULL THEN NULL
      ELSE u.email::TEXT
    END AS user_email,
    CASE 
      WHEN sl.user_id IS NULL THEN NULL
      ELSE coalesce(m.profile_image, u.profile_image)::TEXT
    END AS user_avatar,
    CASE
      WHEN sl.user_id IS NULL THEN 'guest'
      WHEN m.is_alumni = true THEN 'alumni'
      WHEN m.id IS NOT NULL THEN 'mentor'
      WHEN u.is_admin = true OR u.role = 'admin' THEN 'admin'
      ELSE 'student'
    END::TEXT AS user_role,
    coalesce(m.department, u.department)::TEXT AS user_department,
    u.college_id::TEXT AS user_college_id,
    (sl.user_id IS NULL) AS is_anonymous
  FROM public.search_logs sl
  LEFT JOIN public.users u ON u.id = sl.user_id
  LEFT JOIN public.mentors m ON m.id = sl.user_id
  WHERE
    -- Filter by user type
    (
      p_user_type = 'all'
      OR (p_user_type = 'authenticated' AND sl.user_id IS NOT NULL)
      OR (p_user_type = 'anonymous' AND sl.user_id IS NULL)
      OR (p_user_type = 'zero_results' AND sl.result_count = 0)
    )
    -- Filter by text search (matches query_text, user_name, user_email, user_college_id)
    AND (
      v_trimmed = ''
      OR sl.query_text ILIKE '%' || v_escaped || '%'
      OR (sl.user_id IS NOT NULL AND (
        u.name ILIKE '%' || v_escaped || '%'
        OR m.name ILIKE '%' || v_escaped || '%'
        OR u.email ILIKE '%' || v_escaped || '%'
        OR coalesce(u.college_id, '') ILIKE '%' || v_escaped || '%'
      ))
    )
  ORDER BY sl.created_at DESC
  LIMIT v_capped_limit
  OFFSET v_capped_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_search_logs(INT, INT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_search_logs(INT, INT, TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- get_admin_search_stats: Admin-only RPC for high-level search volume KPIs.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_search_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_total_searches BIGINT;
  v_auth_searches BIGINT;
  v_anon_searches BIGINT;
  v_unique_users BIGINT;
  v_zero_results BIGINT;
BEGIN
  IF NOT public.is_admin_user(v_caller_id) THEN
    RAISE EXCEPTION 'Only admins can view search stats';
  END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE user_id IS NOT NULL),
    count(*) FILTER (WHERE user_id IS NULL),
    count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL),
    count(*) FILTER (WHERE result_count = 0)
  INTO
    v_total_searches,
    v_auth_searches,
    v_anon_searches,
    v_unique_users,
    v_zero_results
  FROM public.search_logs;

  RETURN jsonb_build_object(
    'total_searches', coalesce(v_total_searches, 0),
    'authenticated_searches', coalesce(v_auth_searches, 0),
    'anonymous_searches', coalesce(v_anon_searches, 0),
    'unique_searchers', coalesce(v_unique_users, 0),
    'zero_result_searches', coalesce(v_zero_results, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_search_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_search_stats() TO authenticated;

-- -----------------------------------------------------------------------------
-- Retention: Fold 90-day search_logs cleanup into aggregate_search_quality
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aggregate_search_quality()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.search_result_quality AS srq
        (entity_type, entity_id, click_count_30d, last_clicked_at)
  SELECT si.entity_type,
         si.entity_id,
         count(DISTINCT COALESCE(si.viewer_id::text, 'q:' || si.query_hash))::int,
         max(si.created_at)
  FROM public.search_interactions si
  WHERE si.created_at >= now() - interval '30 days'
  GROUP BY si.entity_type, si.entity_id
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET click_count_30d = EXCLUDED.click_count_30d,
        last_clicked_at = EXCLUDED.last_clicked_at;

  DELETE FROM public.search_result_quality srq
  WHERE NOT EXISTS (
    SELECT 1 FROM public.search_interactions si
    WHERE si.entity_type = srq.entity_type
      AND si.entity_id   = srq.entity_id
      AND si.created_at >= now() - interval '30 days'
  );

  DELETE FROM public.search_interactions
  WHERE created_at < now() - interval '90 days';

  DELETE FROM public.search_logs
  WHERE created_at < now() - interval '90 days';

  DELETE FROM public.search_analytics
  WHERE last_searched_at < now() - interval '180 days';
END;
$$;

REVOKE ALL ON FUNCTION public.aggregate_search_quality()
  FROM PUBLIC, anon, authenticated;
