-- Fix: search_campus_users excluded any row where both the mentor and users
-- name were null/blank, which made the SELECT list's
-- coalesce(..., 'Student') fallback unreachable dead code and left students
-- who haven't set a display name yet exactly as unsearchable as before this
-- feature existed (the class of problem 20260830190000's header comment says
-- this function exists to fix).
--
-- Re-creates the function so a nameless row is included and shown as
-- 'Student', while still excluding rows whose visible name is a raw email
-- address. Everything else (escaping, self-exclusion, limit, grants) is
-- unchanged from 20260830210000.

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
    -- Exclude raw email strings if any slipped into the name field. A
    -- nameless row (both m.name and u.name null/blank) has nothing to match
    -- the pattern against, so it passes through and displays as 'Student'.
    AND (
      coalesce(nullif(trim(m.name), ''), nullif(trim(u.name), '')) IS NULL
      OR coalesce(nullif(trim(m.name), ''), nullif(trim(u.name), '')) !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
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
