-- Event RSVPs in Mentor Live Presence & User Event Schedule Resolver
--
-- Why this exists:
-- Connects event_attendees and srmap_events_cache into CampusBrain and the live
-- availability engine.
-- 1. Returns a user's upcoming/ongoing event schedule for queries like
--    "What upcoming events is Gyan attending?".
-- 2. Enhances get_mentors_live_availability to check if a mentor has an active
--    'going' event right now (e.g. 3:00 PM - 4:00 PM seminar) in IST.

-- srmap_events_cache.start_date/end_date are scraped text, not timestamptz.
-- The source feed has no per-event "all day" flag, so a multi-day fest with
-- an unknown time comes through as a midnight-to-midnight placeholder
-- (e.g. '2026-09-04 00:00:00' .. '2026-09-04 23:59:59'). That placeholder is
-- not a real commitment for every hour of the day -- treating a "going" RSVP
-- to one as 24 hours of "busy" would be worse than not knowing, the same
-- mistake Phase 5 of the faculty roadmap was deliberately built to avoid. A
-- genuine multi-day event with real start/end times (a 3-day conference,
-- 9am to 5pm) does not match this pattern and is correctly treated as busy
-- for its real span. Single definition so get_user_event_schedule's display
-- and get_mentors_live_availability's busy gate can never disagree.
CREATE OR REPLACE FUNCTION public.event_is_all_day(p_start_date text, p_end_date text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_start_date LIKE '%00:00:00' AND p_end_date LIKE '%23:59:59';
$$;

COMMENT ON FUNCTION public.event_is_all_day(text, text) IS
  'True when an event''s scraped start/end is the midnight-to-midnight placeholder used for unknown times, not a reported all-day event. Shared by get_user_event_schedule and get_mentors_live_availability so they cannot disagree on which events are real time commitments.';

-- 1. User Event Schedule RPC
CREATE OR REPLACE FUNCTION public.get_user_event_schedule(p_user_id uuid)
RETURNS TABLE (
  event_id         bigint,
  title            text,
  start_date       text,
  end_date         text,
  event_type       text,
  department       text,
  link             text,
  image_url        text,
  status           text,
  note             text,
  is_happening_now boolean,
  is_all_day       boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.id AS event_id,
    e.title,
    e.start_date,
    e.end_date,
    e.event_type,
    e.department,
    e.link,
    e.image_url,
    ea.status,
    ea.note,
    ((now() AT TIME ZONE 'Asia/Kolkata') >= e.start_date::timestamp
      AND (now() AT TIME ZONE 'Asia/Kolkata') <= e.end_date::timestamp) AS is_happening_now,
    public.event_is_all_day(e.start_date, e.end_date) AS is_all_day
  FROM public.event_attendees ea
  JOIN public.srmap_events_cache e ON e.id = ea.event_id
  WHERE ea.user_id = p_user_id
    AND e.end_date::timestamp >= ((now() AT TIME ZONE 'Asia/Kolkata') - interval '2 hours')
  ORDER BY e.start_date::timestamp ASC;
$$;

COMMENT ON FUNCTION public.get_user_event_schedule(uuid) IS
  'Returns upcoming and ongoing RSVP events for a given student or mentor. Public because event_attendees is public.';

REVOKE ALL ON FUNCTION public.get_user_event_schedule(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_event_schedule(uuid) TO anon, authenticated, service_role, postgres;

-- 2. Enhanced get_mentors_live_availability with active event status
DROP FUNCTION IF EXISTS public.get_mentor_live_availability(uuid);
DROP FUNCTION IF EXISTS public.get_mentors_live_availability(uuid[]);

CREATE OR REPLACE FUNCTION public.get_mentors_live_availability(p_mentor_ids uuid[])
RETURNS TABLE (
  mentor_id             uuid,
  name                  text,
  slug                  text,
  department            text,
  is_available          boolean,
  available_from        timestamptz,
  availability_note     text,
  is_active_now         boolean,
  median_reply_minutes  int,
  last_message_at       timestamptz,
  students_helped       int,
  current_event_title    text,
  current_event_end      text,
  upcoming_going_count   int,
  upcoming_interested_count int
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
      AND cur_evt.current_event_title IS NULL) AS is_active_now,
    act.median_reply_minutes,
    act.last_message_at,
    act.students_helped,
    cur_evt.current_event_title,
    cur_evt.current_event_end,
    COALESCE(up_evt.going_count, 0) AS upcoming_going_count,
    COALESCE(up_evt.interested_count, 0) AS upcoming_interested_count
  FROM public.mentors m
  LEFT JOIN LATERAL public.mentor_activity(m.id) act ON true
  -- Only a *confirmed* ("going") RSVP to a real, bounded time window makes a
  -- mentor busy. A placeholder all-day window (see event_is_all_day) is
  -- excluded on purpose: it says "we don't know when," not "unavailable all
  -- day."
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
  -- Kept apart the same way get_event_attendance_counts already keeps them:
  -- 'going' is a commitment, 'interested' is a bookmark, and collapsing them
  -- into one number would let the model call a bookmark "attending."
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE ea.status = 'going')::int AS going_count,
      COUNT(*) FILTER (WHERE ea.status = 'interested')::int AS interested_count
    FROM public.event_attendees ea
    JOIN public.srmap_events_cache e ON e.id = ea.event_id
    WHERE ea.user_id = m.id
      AND e.end_date::timestamp >= (now() AT TIME ZONE 'Asia/Kolkata')
  ) up_evt ON true
  WHERE m.id = ANY(p_mentor_ids);
$$;

COMMENT ON FUNCTION public.get_mentors_live_availability(uuid[]) IS
  'Batch live presence, reply turnaround, and active event RSVP lookup for mentors. Public because mentor profile and availability status are public.';

REVOKE ALL ON FUNCTION public.get_mentors_live_availability(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mentors_live_availability(uuid[]) TO anon, authenticated, service_role, postgres;

CREATE OR REPLACE FUNCTION public.get_mentor_live_availability(p_mentor_id uuid)
RETURNS TABLE (
  mentor_id             uuid,
  name                  text,
  slug                  text,
  department            text,
  is_available          boolean,
  available_from        timestamptz,
  availability_note     text,
  is_active_now         boolean,
  median_reply_minutes  int,
  last_message_at       timestamptz,
  students_helped       int,
  current_event_title    text,
  current_event_end      text,
  upcoming_going_count   int,
  upcoming_interested_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.get_mentors_live_availability(ARRAY[p_mentor_id]);
$$;

COMMENT ON FUNCTION public.get_mentor_live_availability(uuid) IS
  'Single mentor live presence and active event RSVP lookup. Calls get_mentors_live_availability.';

REVOKE ALL ON FUNCTION public.get_mentor_live_availability(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mentor_live_availability(uuid) TO anon, authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.event_is_all_day(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_is_all_day(text, text) TO anon, authenticated, service_role, postgres;
