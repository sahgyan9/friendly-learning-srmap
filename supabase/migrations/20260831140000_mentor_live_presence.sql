-- Mentor Live Presence & Availability Resolver
--
-- Why this exists:
-- Allows CampusBrain (generate-ai-overview) and the campus guide AI (ai-chatbot)
-- to answer real-time temporal and presence queries (e.g. "Is Gyan free right now?",
-- "Is [Mentor] accepting chats today?") with deterministic database ground truth.
--
-- Exposes:
-- - is_available & available_from (whether profile is active or paused)
-- - availability_note (custom message e.g. "Available after 5 PM")
-- - is_active_now (boolean computed against current timestamp)
-- - median_reply_minutes & last_message_at (measured reply velocity from conversations)
-- - students_helped (verified count)

CREATE OR REPLACE FUNCTION public.get_mentors_live_availability(p_mentor_ids uuid[])
RETURNS TABLE (
  mentor_id            uuid,
  name                 text,
  slug                 text,
  department           text,
  is_available         boolean,
  available_from       timestamptz,
  availability_note    text,
  is_active_now        boolean,
  median_reply_minutes int,
  last_message_at      timestamptz,
  students_helped      int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.id AS mentor_id,
    m.name,
    m.slug,
    m.department,
    COALESCE(m.is_available, true) AS is_available,
    m.available_from,
    m.availability_note,
    (COALESCE(m.is_available, true) = true AND (m.available_from IS NULL OR m.available_from <= now())) AS is_active_now,
    act.median_reply_minutes,
    act.last_message_at,
    act.students_helped
  FROM public.mentors m
  LEFT JOIN LATERAL public.mentor_activity(m.id) act ON true
  WHERE m.id = ANY(p_mentor_ids);
$$;

COMMENT ON FUNCTION public.get_mentors_live_availability(uuid[]) IS
  'Batch live presence and response turnaround lookup for mentors. Public because mentor profile and availability status are public.';

REVOKE ALL ON FUNCTION public.get_mentors_live_availability(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mentors_live_availability(uuid[]) TO anon, authenticated, service_role, postgres;

CREATE OR REPLACE FUNCTION public.get_mentor_live_availability(p_mentor_id uuid)
RETURNS TABLE (
  mentor_id            uuid,
  name                 text,
  slug                 text,
  department           text,
  is_available         boolean,
  available_from       timestamptz,
  availability_note    text,
  is_active_now        boolean,
  median_reply_minutes int,
  last_message_at      timestamptz,
  students_helped      int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.get_mentors_live_availability(ARRAY[p_mentor_id]);
$$;

COMMENT ON FUNCTION public.get_mentor_live_availability(uuid) IS
  'Single mentor live presence and response turnaround lookup. Calls get_mentors_live_availability.';

REVOKE ALL ON FUNCTION public.get_mentor_live_availability(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mentor_live_availability(uuid) TO anon, authenticated, service_role, postgres;
