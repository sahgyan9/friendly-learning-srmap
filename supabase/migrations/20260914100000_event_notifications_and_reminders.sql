-- =============================================================================
-- University Event Notifications & Pre-Event Reminders
--
-- 1. Extends public.notifications type constraint to allow:
--    - 'event_alert': instant RSVP confirmation notifications
--    - 'event_reminder': 24-hour and starting-soon event reminders
-- 2. Creates public.dispatch_upcoming_event_reminders() RPC to deterministically
--    generate in-app and push reminders for students before events start.
-- 3. Schedules hourly reminder sweep via pg_cron.
-- =============================================================================

-- 1. Extend notifications.type constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'message',
    'badge',
    'mention',
    'system',
    'alumni_prompt',
    'attendance_alert',
    'fee_alert',
    'event_alert',
    'event_reminder'
  ]));

-- 2. Deterministic reminder dispatch function
CREATE OR REPLACE FUNCTION public.dispatch_upcoming_event_reminders(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  notification_id uuid,
  user_id uuid,
  title text,
  content text,
  event_id bigint,
  url text,
  reminder_tier text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now_ist timestamp;
BEGIN
  v_now_ist := (now() AT TIME ZONE 'Asia/Kolkata');

  -- Security check: if called by an authenticated user, enforce that they can only dispatch for themselves
  IF auth.uid() IS NOT NULL AND p_user_id IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied: cannot dispatch event reminders for another user';
  END IF;

  RETURN QUERY
  WITH target_attendees AS (
    SELECT
      ea.user_id,
      ea.status,
      e.id AS event_id,
      e.title AS event_title,
      e.start_date,
      e.venue,
      e.start_date::timestamp AS start_time_ist
    FROM public.event_attendees ea
    JOIN public.srmap_events_cache e ON e.id = ea.event_id
    WHERE (p_user_id IS NULL OR ea.user_id = p_user_id)
      AND e.start_date::timestamp >= v_now_ist
  ),
  -- Tier 1: 24-Hour Reminder (starts within 2h to 26h from now)
  tier_24h AS (
    SELECT
      ta.user_id,
      ta.event_id,
      ta.event_title,
      ta.venue,
      ta.start_time_ist,
      '24h'::text AS reminder_tier,
      'Tomorrow: ' || ta.event_title AS notif_title,
      ta.event_title || ' starts on ' ||
        to_char(ta.start_time_ist, 'Mon DD at HH12:MI AM') ||
        COALESCE(' at ' || NULLIF(trim(ta.venue), ''), '') ||
        '. Tap to view schedule and location.' AS notif_content
    FROM target_attendees ta
    WHERE ta.start_time_ist > (v_now_ist + interval '2 hours')
      AND ta.start_time_ist <= (v_now_ist + interval '26 hours')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = ta.user_id
          AND n.type = 'event_reminder'
          AND (n.data->>'event_id')::bigint = ta.event_id
          AND n.data->>'reminder_tier' = '24h'
      )
  ),
  -- Tier 2: Starting Soon Reminder (starts within 0 to 2h from now)
  tier_soon AS (
    SELECT
      ta.user_id,
      ta.event_id,
      ta.event_title,
      ta.venue,
      ta.start_time_ist,
      'starting_soon'::text AS reminder_tier,
      'Starting Soon: ' || ta.event_title AS notif_title,
      ta.event_title || ' starts in less than 2 hours' ||
        COALESCE(' at ' || NULLIF(trim(ta.venue), ''), '') ||
        '. Don''t miss it!' AS notif_content
    FROM target_attendees ta
    WHERE ta.start_time_ist >= v_now_ist
      AND ta.start_time_ist <= (v_now_ist + interval '2 hours')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = ta.user_id
          AND n.type = 'event_reminder'
          AND (n.data->>'event_id')::bigint = ta.event_id
          AND n.data->>'reminder_tier' = 'starting_soon'
      )
  ),
  combined_reminders AS (
    SELECT * FROM tier_24h
    UNION ALL
    SELECT * FROM tier_soon
  ),
  inserted_rows AS (
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      content,
      data,
      read,
      created_at
    )
    SELECT
      cr.user_id,
      'event_reminder',
      cr.notif_title,
      cr.notif_content,
      jsonb_build_object(
        'event_id', cr.event_id,
        'url', '/events/' || cr.event_id,
        'reminder_tier', cr.reminder_tier,
        'type', 'event_reminder'
      ),
      false,
      now()
    FROM combined_reminders cr
    RETURNING
      id AS notification_id,
      public.notifications.user_id,
      public.notifications.title,
      public.notifications.content,
      (public.notifications.data->>'event_id')::bigint AS event_id,
      (public.notifications.data->>'url') AS url,
      (public.notifications.data->>'reminder_tier') AS reminder_tier
  )
  SELECT * FROM inserted_rows;
END;
$$;

COMMENT ON FUNCTION public.dispatch_upcoming_event_reminders(uuid) IS
  'Scans upcoming campus events RSVPed by students and generates 24-hour and starting-soon in-app reminders. Idempotent.';

REVOKE ALL ON FUNCTION public.dispatch_upcoming_event_reminders(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_upcoming_event_reminders(uuid) TO authenticated, service_role, postgres;

-- 3. Schedule hourly cron check for event reminders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'event-reminders-hourly') THEN
    PERFORM cron.schedule(
      'event-reminders-hourly',
      '0 * * * *',
      $cmd$ SELECT public.dispatch_upcoming_event_reminders(); $cmd$
    );
  END IF;
END $$;
