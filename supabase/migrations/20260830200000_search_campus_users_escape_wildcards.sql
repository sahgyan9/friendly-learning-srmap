-- Fix: search_campus_users interpolated the caller-supplied query directly into
-- ILIKE patterns without escaping SQL wildcard metacharacters (% and _), so a
-- literal '%' or '_' typed by the searcher was treated as a pattern wildcard
-- instead of a literal character, returning broader/unexpected matches.
--
-- This re-creates the function with the query escaped before use in ILIKE/LIKE
-- patterns. Behavior is otherwise unchanged.

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

  IF v_trimmed = '' THEN
    -- When query is empty, return active mentors and students to discover
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
    ORDER BY
      CASE WHEN m.id IS NOT NULL THEN 0 ELSE 1 END,
      coalesce(m.name, u.name) ASC
    LIMIT v_capped_limit;
  ELSE
    -- Search by name, department, or keywords
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
      AND (
        u.name ILIKE '%' || v_escaped || '%'
        OR m.name ILIKE '%' || v_escaped || '%'
        OR coalesce(u.department, '') ILIKE '%' || v_escaped || '%'
        OR coalesce(m.department, '') ILIKE '%' || v_escaped || '%'
      )
    ORDER BY
      -- Exact name match first
      CASE
        WHEN lower(coalesce(m.name, u.name)) = lower(v_trimmed) THEN 0
        WHEN lower(coalesce(m.name, u.name)) LIKE lower(v_escaped) || '%' THEN 1
        WHEN lower(coalesce(m.name, u.name)) LIKE '%' || lower(v_escaped) || '%' THEN 2
        ELSE 3
      END,
      CASE WHEN m.id IS NOT NULL THEN 0 ELSE 1 END,
      coalesce(m.name, u.name) ASC
    LIMIT v_capped_limit;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.search_campus_users(TEXT, INT) IS
  'Search students, mentors, and peers across SRM AP for messaging by name or department. Safe display fields only; excludes private contact details.';

REVOKE ALL ON FUNCTION public.search_campus_users(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_campus_users(TEXT, INT) TO authenticated;
