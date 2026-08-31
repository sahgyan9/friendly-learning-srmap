-- Sync mentor user roles and make chat profiles resolve mentor status dynamically.
--
-- Problem:
-- When mentors register or publish their profile via the Profile Setup Studio,
-- their details are inserted into public.mentors, but public.users.role remained
-- 'student' with verification_status 'pending'. As a result, chat headers and
-- directory searches rendered active mentors as 'Student · Offline' because
-- chat participant resolution and search RPCs read public.users.role directly.
--
-- Solution:
-- 1. Add a PostgreSQL trigger on public.mentors (trg_sync_user_on_mentor_change)
--    that automatically sets public.users.role = 'mentor' and verification_status = 'approved'
--    whenever a mentor record is inserted or updated.
-- 2. Update chat_participant_profiles() to dynamically resolve mentor role from
--    public.mentors so chat headers are resilient even in transient states.
-- 3. Update search_campus_users() to prioritize mentor role when m.id is present.
-- 4. Backfill all existing desynced mentor rows in public.users.

-- 1. Trigger function to keep users.role and verification_status in sync with mentors
CREATE OR REPLACE FUNCTION public.sync_user_on_mentor_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Avoid promoting General/placeholder mentors
  IF COALESCE(NEW.department, '') = 'General' THEN
    RETURN NEW;
  END IF;

  UPDATE public.users
  SET
    role = CASE
             WHEN role IN ('admin', 'both') THEN role
             ELSE 'mentor'
           END,
    verification_status = CASE
                            WHEN verification_status IN ('pending', 'unverified') OR verification_status IS NULL THEN 'approved'
                            ELSE verification_status
                          END,
    department = COALESCE(users.department, NEW.department),
    bio = CASE WHEN COALESCE(users.bio, '') = '' THEN COALESCE(NEW.bio, users.bio) ELSE users.bio END,
    linkedin_url = COALESCE(users.linkedin_url, NEW.linkedin_url),
    skills = CASE WHEN cardinality(users.skills) = 0 OR users.skills IS NULL THEN COALESCE(NEW.skills, users.skills) ELSE users.skills END
  WHERE id = NEW.id
    AND (
      role = 'student'
      OR verification_status IS DISTINCT FROM 'approved'
      OR department IS NULL
    );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_user_on_mentor_change() IS
  'Automatically syncs public.users.role to mentor and verification_status to approved whenever a mentor profile is inserted or updated.';

REVOKE ALL ON FUNCTION public.sync_user_on_mentor_change() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_sync_user_on_mentor_change ON public.mentors;
CREATE TRIGGER trg_sync_user_on_mentor_change
AFTER INSERT OR UPDATE ON public.mentors
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_on_mentor_change();

-- 2. chat_participant_profiles: dynamically resolve mentor role
CREATE OR REPLACE FUNCTION public.chat_participant_profiles(p_user_ids uuid[])
RETURNS TABLE (
  id            uuid,
  name          text,
  profile_image text,
  role          text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id,
         COALESCE(NULLIF(TRIM(m.name), ''), NULLIF(TRIM(u.name), ''), 'Student')::text AS name,
         COALESCE(m.profile_image, u.profile_image)::text AS profile_image,
         CASE
           WHEN u.role = 'admin' THEN 'admin'
           WHEN u.role = 'both' THEN 'both'
           WHEN m.id IS NOT NULL AND COALESCE(m.department, '') != 'General' THEN 'mentor'
           ELSE COALESCE(u.role, 'student')
         END::text AS role
    FROM public.users u
    LEFT JOIN public.mentors m ON m.id = u.id
   WHERE u.id = ANY(p_user_ids)
     AND (
       u.id = auth.uid()
       OR EXISTS (
         SELECT 1
           FROM public.conversations c
          WHERE (c.user1_id = auth.uid() and c.user2_id = u.id)
             or (c.user2_id = auth.uid() and c.user1_id = u.id)
       )
     );
$$;

COMMENT ON FUNCTION public.chat_participant_profiles(uuid[]) IS
  'Display fields only (name, image, role) for people the caller shares a conversation with. Dynamically resolves mentor status from public.mentors.';

REVOKE ALL ON FUNCTION public.chat_participant_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_participant_profiles(uuid[]) TO authenticated;

-- 3. search_campus_users: ensure mentor role is prioritized
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
  v_escaped TEXT := replace(replace(replace(trim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_');
  v_capped_limit INT := least(greatest(coalesce(p_limit, 15), 1), 50);
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    coalesce(nullif(trim(m.name), ''), nullif(trim(u.name), ''), 'Student')::TEXT AS name,
    coalesce(m.profile_image, u.profile_image)::TEXT AS profile_image,
    CASE
      WHEN u.role = 'admin' THEN 'admin'
      WHEN u.role = 'both' THEN 'both'
      WHEN m.id IS NOT NULL AND coalesce(m.department, '') != 'General' THEN 'mentor'
      ELSE coalesce(u.role, 'student')
    END::TEXT AS role,
    coalesce(m.department, u.department)::TEXT AS department,
    CASE
      WHEN m.is_alumni = true THEN 'Alumni'
      WHEN m.id IS NOT NULL AND coalesce(m.department, '') != 'General' THEN 'Mentor'
      WHEN u.role = 'admin' THEN 'Admin'
      ELSE 'Student'
    END::TEXT AS badge
  FROM public.users u
  LEFT JOIN public.mentors m ON m.id = u.id
  WHERE u.id <> v_caller_id
    AND (
      coalesce(nullif(trim(m.name), ''), nullif(trim(u.name), '')) IS NULL
      OR coalesce(nullif(trim(m.name), ''), nullif(trim(u.name), '')) !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
    AND (
      v_trimmed = ''
      OR u.name ILIKE '%' || v_escaped || '%'
      OR m.name ILIKE '%' || v_escaped || '%'
      OR coalesce(u.department, '') ILIKE '%' || v_escaped || '%'
      OR coalesce(m.department, '') ILIKE '%' || v_escaped || '%'
    )
  ORDER BY
    CASE
      WHEN v_trimmed = '' THEN 0
      WHEN lower(coalesce(m.name, u.name)) = lower(v_trimmed) THEN 0
      WHEN lower(coalesce(m.name, u.name)) LIKE lower(v_escaped) || '%' THEN 1
      WHEN lower(coalesce(m.name, u.name)) LIKE '%' || lower(v_escaped) || '%' THEN 2
      ELSE 3
    END,
    CASE WHEN m.id IS NOT NULL AND coalesce(m.department, '') != 'General' THEN 0 ELSE 1 END,
    coalesce(m.name, u.name) ASC NULLS LAST
  LIMIT v_capped_limit;
END;
$$;

COMMENT ON FUNCTION public.search_campus_users(TEXT, INT) IS
  'Directory search for starting direct messages. Dynamically prioritizes mentor status.';

REVOKE ALL ON FUNCTION public.search_campus_users(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_campus_users(TEXT, INT) TO authenticated;

-- 4. Backfill all existing desynced mentors in public.users
UPDATE public.users u
   SET role = 'mentor',
       verification_status = 'approved'
  FROM public.mentors m
 WHERE u.id = m.id
   AND u.role = 'student'
   AND COALESCE(m.department, '') != 'General';
