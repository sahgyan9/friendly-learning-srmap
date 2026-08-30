-- Simplify: search_campus_users had two near-identical RETURN QUERY blocks
-- (empty-query vs. search-query) differing only in WHERE/ORDER BY. Collapsed
-- into one query so a future fix to the SELECT list can't land in one branch
-- and not the other. Behavior is unchanged (verified by the existing
-- migration tests, all of which still pass against this version).
--
-- No trigram/GIN index is added for the ILIKE search below. This mirrors the
-- documented reasoning in 20260726010000_faculty_ratings.sql and
-- 20260806100000_faculty_research_interests.sql: pg_trgm is deliberately kept
-- out of this project for directory-sized tables, since a sequential ILIKE
-- scan is already sub-millisecond at that scale and the extension would add a
-- schema-placement dependency for no measurable gain. Revisit only if
-- `SELECT count(*) FROM public.users` shows this table has grown well past
-- that scale and EXPLAIN ANALYZE on a real search query shows it matters.

CREATE OR REPLACE FUNCTION public.search_campus_users(
  p_query TEXT DEFAULT '',
  p_limit INT DEFAULT 15
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  profile_image TEXT,
  role TEXT,
  department TEXT,
  badge TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_trimmed TEXT := trim(coalesce(p_query, ''));
  -- Escape backslash first, then the ILIKE wildcard characters, so a literal
  -- '%' or '_' typed by the searcher matches itself instead of acting as a
  -- pattern wildcard. Postgres ILIKE's default escape character is backslash.
  v_escaped TEXT := replace(replace(replace(trim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_');
  v_capped_limit INT := least(greatest(coalesce(p_limit, 15), 1), 50);
BEGIN
  -- Caller must be authenticated
  IF v_caller_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    coalesce(nullif(trim(m.name), ''), nullif(trim(u.name), ''), 'Student')::TEXT AS name,
    coalesce(m.profile_image, u.profile_image)::TEXT AS profile_image,
    coalesce(u.role, CASE WHEN m.id IS NOT NULL THEN 'mentor' ELSE 'student' END)::TEXT AS role,
    coalesce(m.department, u.department)::TEXT AS department,
    CASE
      WHEN m.is_alumni = true THEN 'Alumni'
      WHEN m.id IS NOT NULL THEN 'Mentor'
      WHEN u.role = 'admin' THEN 'Admin'
      ELSE 'Student'
    END::TEXT AS badge
  FROM public.users u
  LEFT JOIN public.mentors m ON m.id = u.id
  WHERE u.id <> v_caller_id
    AND coalesce(nullif(trim(m.name), ''), nullif(trim(u.name), '')) IS NOT NULL
    -- Exclude raw email strings if any slipped into the name field
    AND coalesce(nullif(trim(m.name), ''), nullif(trim(u.name), '')) !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    -- Empty query: everyone (directory browse). Non-empty: match by name or department.
    AND (
      v_trimmed = ''
      OR u.name ILIKE '%' || v_escaped || '%'
      OR m.name ILIKE '%' || v_escaped || '%'
      OR coalesce(u.department, '') ILIKE '%' || v_escaped || '%'
      OR coalesce(m.department, '') ILIKE '%' || v_escaped || '%'
    )
  ORDER BY
    -- Empty query: no ranking tier, everyone ties at 0. Non-empty: exact name
    -- match first, then prefix match, then substring match, then everything else.
    CASE
      WHEN v_trimmed = '' THEN 0
      WHEN lower(coalesce(m.name, u.name)) = lower(v_trimmed) THEN 0
      WHEN lower(coalesce(m.name, u.name)) LIKE lower(v_escaped) || '%' THEN 1
      WHEN lower(coalesce(m.name, u.name)) LIKE '%' || lower(v_escaped) || '%' THEN 2
      ELSE 3
    END,
    CASE WHEN m.id IS NOT NULL THEN 0 ELSE 1 END,
    coalesce(m.name, u.name) ASC
  LIMIT v_capped_limit;
END;
$$;

COMMENT ON FUNCTION public.search_campus_users(TEXT, INT) IS
  'Search students, mentors, and peers across SRM AP for messaging by name or department. Safe display fields only; excludes private contact details.';

REVOKE ALL ON FUNCTION public.search_campus_users(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_campus_users(TEXT, INT) TO authenticated;
