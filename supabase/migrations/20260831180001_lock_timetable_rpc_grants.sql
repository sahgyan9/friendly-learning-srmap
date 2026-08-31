-- =============================================================================
-- Lock timetable RPCs to service_role only (privacy fix)
--
-- Why:
-- get_user_weekly_timetable, get_mentors_live_availability, and
-- get_mentor_live_availability were shipped with anon/authenticated EXECUTE
-- grants. All three are SECURITY DEFINER and do not check auth.uid() against
-- the requested user_id, which meant any unauthenticated caller could:
--   • Pull any linked student's or mentor's full weekly class schedule
--     (course codes, exact times, room numbers) by UUID alone.
--   • Resolve a named person's real-time physical location via the
--     availability RPC (current_class_room, current_class_name).
--
-- Nothing in src/ calls any of these three directly — they are edge-function-
-- only RPCs (ai-chatbot, generate-ai-overview) called with the service-role
-- key. The anon/authenticated grants served no purpose.
--
-- Applied to production via Supabase MCP apply_migration on 2026-08-31.
-- Verified: has_function_privilege('anon', ...) = false for all three.
-- =============================================================================

-- Re-create with the correct body (identical logic, removes old acl entries)
CREATE OR REPLACE FUNCTION public.get_user_weekly_timetable(p_user_id uuid)
RETURNS TABLE (
  day_order        smallint,
  day_name         text,
  hour             smallint,
  start_time       text,
  end_time         text,
  slot             text,
  course_code      text,
  course_name      text,
  faculty_name     text,
  room_number      text,
  is_lab           boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
  SELECT
    st.day_order,
    st.day_name,
    st.hour,
    st.start_time::text,
    st.end_time::text,
    st.slot,
    st.course_code,
    st.course_name,
    st.faculty_name,
    st.room_number,
    st.is_lab
  FROM public.student_timetables st
  WHERE st.user_id = p_user_id
  ORDER BY st.day_order ASC, st.hour ASC;
$func$;

REVOKE ALL ON FUNCTION public.get_user_weekly_timetable(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_weekly_timetable(uuid) TO service_role, postgres;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_read_only_user') THEN
    GRANT EXECUTE ON FUNCTION public.get_user_weekly_timetable(uuid) TO supabase_read_only_user;
  END IF;
END $$;

-- get_mentors_live_availability: recreate with day-name-only class matching
-- (removes the day_order = ISODOW fallback that incorrectly assumed SRM's
-- rotating Day Order always aligns with the calendar weekday — it doesn't on
-- any week with a holiday-driven make-up day) and strips the anon/authenticated
-- grants that the class-room field makes unsafe.
DROP FUNCTION IF EXISTS public.get_mentor_live_availability(uuid);
DROP FUNCTION IF EXISTS public.get_mentors_live_availability(uuid[]);

CREATE OR REPLACE FUNCTION public.get_mentors_live_availability(p_mentor_ids uuid[])
RETURNS TABLE (
  mentor_id                 uuid,
  name                      text,
  slug                      text,
  department                text,
  is_available              boolean,
  available_from            timestamptz,
  availability_note         text,
  is_active_now             boolean,
  median_reply_minutes      int,
  last_message_at           timestamptz,
  students_helped           int,
  current_event_title       text,
  current_event_end         text,
  upcoming_going_count      int,
  upcoming_interested_count int,
  current_class_code        text,
  current_class_name        text,
  current_class_end         text,
  current_class_room        text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS mentor_id,
    m.name,
    m.slug,
    m.department,
    COALESCE(m.is_available, true) AS is_available,
    m.available_from,
    m.availability_note,
    (public.mentor_is_listed(m.is_available, m.available_from)
      AND cur_evt.current_event_title IS NULL
      AND cur_cls.current_class_name IS NULL) AS is_active_now,
    act.median_reply_minutes,
    act.last_message_at,
    act.students_helped,
    cur_evt.current_event_title,
    cur_evt.current_event_end,
    COALESCE(up_evt.going_count, 0) AS upcoming_going_count,
    COALESCE(up_evt.interested_count, 0) AS upcoming_interested_count,
    cur_cls.current_class_code,
    cur_cls.current_class_name,
    cur_cls.current_class_end,
    cur_cls.current_class_room
  FROM public.mentors m
  LEFT JOIN LATERAL public.mentor_activity(m.id) act ON true
  LEFT JOIN LATERAL (
    SELECT
      e.title AS current_event_title,
      e.end_date AS current_event_end
    FROM public.event_attendees ea
    JOIN public.srmap_events_cache e ON e.id = ea.event_id
    WHERE ea.user_id = m.id
      AND ea.status = 'going'
      AND NOT public.event_is_all_day(e.start_date, e.end_date)
      AND (now() AT TIME ZONE 'Asia/Kolkata') >= e.start_date::timestamp
      AND (now() AT TIME ZONE 'Asia/Kolkata') <= e.end_date::timestamp
    ORDER BY e.start_date::timestamp ASC
    LIMIT 1
  ) cur_evt ON true
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE ea.status = 'going')::int AS going_count,
      COUNT(*) FILTER (WHERE ea.status = 'interested')::int AS interested_count
    FROM public.event_attendees ea
    JOIN public.srmap_events_cache e ON e.id = ea.event_id
    WHERE ea.user_id = m.id
      AND e.end_date::timestamp >= (now() AT TIME ZONE 'Asia/Kolkata')
  ) up_evt ON true
  LEFT JOIN LATERAL (
    -- Day-name-only match: deliberately never falls back to day_order = ISODOW.
    -- SRM AP's Day Order is a rotating academic cycle that drifts from the
    -- calendar weekday on any week with a holiday-driven make-up day. Guessing
    -- "Day N == today's Nth weekday" is a wrong-not-missing answer (same
    -- reasoning as event_is_all_day). Only rows the portal labelled with an
    -- actual weekday name ("Monday".."Saturday") are used here.
    SELECT
      st.course_code AS current_class_code,
      st.course_name AS current_class_name,
      st.end_time::text AS current_class_end,
      st.room_number AS current_class_room
    FROM public.student_timetables st
    WHERE st.user_id = m.id
      AND st.day_name ILIKE TRIM(TO_CHAR((now() AT TIME ZONE 'Asia/Kolkata'), 'Day')) || '%'
      AND (now() AT TIME ZONE 'Asia/Kolkata')::time >= st.start_time
      AND (now() AT TIME ZONE 'Asia/Kolkata')::time <= st.end_time
      AND NOT EXISTS (
        SELECT 1 FROM public.get_calendar_day((now() AT TIME ZONE 'Asia/Kolkata')::date)
        WHERE is_holiday = true
      )
    ORDER BY st.hour ASC
    LIMIT 1
  ) cur_cls ON true
  WHERE m.id = ANY(p_mentor_ids);
END;
$func$;

COMMENT ON FUNCTION public.get_mentors_live_availability(uuid[]) IS
  'Batch live presence, reply turnaround, active events, and ongoing timetable class lookup for mentors. Carries current_class_room/current_class_name (real-time physical location) so is service-role only. Only edge functions call this via the service-role key; nothing in src/ calls it directly.';

REVOKE ALL ON FUNCTION public.get_mentors_live_availability(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mentors_live_availability(uuid[]) TO service_role, postgres;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_read_only_user') THEN
    GRANT EXECUTE ON FUNCTION public.get_mentors_live_availability(uuid[]) TO supabase_read_only_user;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_mentor_live_availability(p_mentor_id uuid)
RETURNS TABLE (
  mentor_id                 uuid,
  name                      text,
  slug                      text,
  department                text,
  is_available              boolean,
  available_from            timestamptz,
  availability_note         text,
  is_active_now             boolean,
  median_reply_minutes      int,
  last_message_at           timestamptz,
  students_helped           int,
  current_event_title       text,
  current_event_end         text,
  upcoming_going_count      int,
  upcoming_interested_count int,
  current_class_code        text,
  current_class_name        text,
  current_class_end         text,
  current_class_room        text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
  SELECT * FROM public.get_mentors_live_availability(ARRAY[p_mentor_id]);
$func$;

COMMENT ON FUNCTION public.get_mentor_live_availability(uuid) IS
  'Single mentor live presence and active class/event lookup. Calls get_mentors_live_availability; service-role only for the same reason.';

REVOKE ALL ON FUNCTION public.get_mentor_live_availability(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mentor_live_availability(uuid) TO service_role, postgres;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_read_only_user') THEN
    GRANT EXECUTE ON FUNCTION public.get_mentor_live_availability(uuid) TO supabase_read_only_user;
  END IF;
END $$;
