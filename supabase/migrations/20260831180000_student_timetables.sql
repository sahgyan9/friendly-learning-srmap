-- =============================================================================
-- SRM Portal Student Timetable Storage & Real-Time Class Presence
--
-- Why this exists:
-- Persists weekly class schedules from the SRM AP student portal (Section 5
-- of the student report) and links it into the mentor availability engine so
-- CampusBrain knows if a mentor is currently in class at any given hour.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.student_timetables (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  register_number  text,
  day_order        smallint,
  day_name         text NOT NULL,
  hour             smallint NOT NULL,
  start_time       time NOT NULL,
  end_time         time NOT NULL,
  slot             text,
  course_code      text NOT NULL,
  course_name      text NOT NULL,
  faculty_name     text,
  room_number      text,
  is_lab           boolean DEFAULT false,
  last_synced_at   timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_timetables_slot UNIQUE (user_id, day_name, hour, course_code)
);

CREATE INDEX IF NOT EXISTS idx_student_timetables_user_id ON public.student_timetables (user_id);
CREATE INDEX IF NOT EXISTS idx_student_timetables_day ON public.student_timetables (user_id, day_name, start_time, end_time);

ALTER TABLE public.student_timetables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own timetable" ON public.student_timetables;
CREATE POLICY "Users can view their own timetable"
  ON public.student_timetables FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage timetables" ON public.student_timetables;
CREATE POLICY "Service role can manage timetables"
  ON public.student_timetables FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.student_timetables TO authenticated;
GRANT ALL ON public.student_timetables TO service_role;

-- -----------------------------------------------------------------------------
-- RPC: get_user_weekly_timetable
-- Returns full weekly class schedule for a student/mentor
-- -----------------------------------------------------------------------------
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
AS $$
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
$$;

COMMENT ON FUNCTION public.get_user_weekly_timetable(uuid) IS
  'Returns weekly class schedule for a user. Security definer so mentors class schedule can be checked for availability.';

REVOKE ALL ON FUNCTION public.get_user_weekly_timetable(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_weekly_timetable(uuid) TO anon, authenticated, service_role, postgres;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_read_only_user') THEN
    GRANT EXECUTE ON FUNCTION public.get_user_weekly_timetable(uuid) TO supabase_read_only_user;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Enhanced get_mentors_live_availability with both event and class presence
-- -----------------------------------------------------------------------------
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
    SELECT
      st.course_code AS current_class_code,
      st.course_name AS current_class_name,
      st.end_time::text AS current_class_end,
      st.room_number AS current_class_room
    FROM public.student_timetables st
    WHERE st.user_id = m.id
      AND (
        st.day_name ILIKE TRIM(TO_CHAR((now() AT TIME ZONE 'Asia/Kolkata'), 'Day')) || '%'
        OR st.day_name ILIKE 'Day ' || EXTRACT(ISODOW FROM (now() AT TIME ZONE 'Asia/Kolkata'))::text
        OR st.day_order = EXTRACT(ISODOW FROM (now() AT TIME ZONE 'Asia/Kolkata'))
      )
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
$$;

COMMENT ON FUNCTION public.get_mentors_live_availability(uuid[]) IS
  'Batch live presence, reply turnaround, active events, and ongoing timetable class lookup for mentors.';

REVOKE ALL ON FUNCTION public.get_mentors_live_availability(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mentors_live_availability(uuid[]) TO anon, authenticated, service_role, postgres;
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
AS $$
  SELECT * FROM public.get_mentors_live_availability(ARRAY[p_mentor_id]);
$$;

COMMENT ON FUNCTION public.get_mentor_live_availability(uuid) IS
  'Single mentor live presence and active class/event lookup. Calls get_mentors_live_availability.';

REVOKE ALL ON FUNCTION public.get_mentor_live_availability(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mentor_live_availability(uuid) TO anon, authenticated, service_role, postgres;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_read_only_user') THEN
    GRANT EXECUTE ON FUNCTION public.get_mentor_live_availability(uuid) TO supabase_read_only_user;
  END IF;
END $$;
