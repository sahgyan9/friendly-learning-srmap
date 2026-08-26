-- Migration: 20260826160000_srm_attendance_and_holidays.sql
-- Description: Creates student_attendance table, academic_holidays table,
-- attendance metrics calculation RPCs, and schedules the 5:00 PM Mon-Fri sync job.

CREATE TABLE IF NOT EXISTS public.student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  register_number TEXT NOT NULL,
  course_code TEXT NOT NULL,
  course_name TEXT NOT NULL,
  slot TEXT,
  faculty_name TEXT,
  conducted_hours INTEGER NOT NULL DEFAULT 0,
  attended_hours INTEGER NOT NULL DEFAULT 0,
  absent_hours INTEGER NOT NULL DEFAULT 0,
  attendance_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  classes_needed INTEGER NOT NULL DEFAULT 0,
  safe_bunks INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT student_attendance_user_course_key UNIQUE (user_id, course_code)
);

CREATE TABLE IF NOT EXISTS public.academic_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS & Security for student_attendance
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_attendance FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.student_attendance TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_attendance TO authenticated;

-- Allow attendance_alert type in notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['message', 'badge', 'mention', 'system', 'alumni_prompt', 'attendance_alert']));

DROP POLICY IF EXISTS student_attendance_select_own ON public.student_attendance;
CREATE POLICY student_attendance_select_own ON public.student_attendance
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- RLS & Security for academic_holidays
ALTER TABLE public.academic_holidays ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.academic_holidays FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.academic_holidays TO anon, authenticated;

DROP POLICY IF EXISTS academic_holidays_read_all ON public.academic_holidays;
CREATE POLICY academic_holidays_read_all ON public.academic_holidays
  FOR SELECT TO anon, authenticated
  USING (true);

-- Pre-seed notable academic holidays
INSERT INTO public.academic_holidays (holiday_date, name, is_recurring)
VALUES
  ('2026-01-01', 'New Year''s Day', true),
  ('2026-01-14', 'Makara Sankranti / Pongal', false),
  ('2026-01-15', 'Kanuma', false),
  ('2026-01-26', 'Republic Day', true),
  ('2026-03-04', 'Maha Shivaratri', false),
  ('2026-03-19', 'Ugadi / Telugu New Year', false),
  ('2026-03-25', 'Holi', false),
  ('2026-03-31', 'Eid ul-Fitr', false),
  ('2026-04-14', 'Dr. B.R. Ambedkar Jayanti', true),
  ('2026-05-01', 'May Day', true),
  ('2026-06-07', 'Bakrid / Eid al-Adha', false),
  ('2026-07-07', 'Muharram', false),
  ('2026-08-15', 'Independence Day', true),
  ('2026-09-04', 'Krishna Janmashtami', false),
  ('2026-09-14', 'Ganesh Chaturthi', false),
  ('2026-10-02', 'Gandhi Jayanti', true),
  ('2026-10-19', 'Maha Navami', false),
  ('2026-10-20', 'Vijayadashami / Dussehra', false),
  ('2026-11-08', 'Diwali / Deepavali', false),
  ('2026-12-25', 'Christmas', true)
ON CONFLICT (holiday_date) DO UPDATE SET name = EXCLUDED.name;

-- Helper function to check if a date is a holiday or weekend
CREATE OR REPLACE FUNCTION public.is_non_instructional_day(check_date DATE DEFAULT CURRENT_DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dow INTEGER;
BEGIN
  -- Extract day of week (0 = Sunday, 6 = Saturday)
  dow := EXTRACT(DOW FROM check_date);
  IF dow = 0 OR dow = 6 THEN
    RETURN true;
  END IF;

  -- Check holiday table
  IF EXISTS (SELECT 1 FROM public.academic_holidays WHERE holiday_date = check_date) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_non_instructional_day(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_non_instructional_day(DATE) TO authenticated, service_role;

-- Schedule cron job for 5:00 PM IST (11:30 AM UTC), Monday to Friday
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'srm-attendance-sync-daily') THEN
    PERFORM cron.schedule(
      'srm-attendance-sync-daily',
      '30 11 * * 1-5',
      $cmd$
      SELECT net.http_post(
        url     := 'https://ruapdkrgcbqrhvsayvpf.supabase.co/functions/v1/sync-srm-portal',
        body    := '{"sync_type":"attendance"}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type',   'application/json',
          'x-cron-secret',  (SELECT decrypted_secret FROM vault.decrypted_secrets
                             WHERE name = 'sync_faculty_cron_secret')
        ),
        timeout_milliseconds := 120000
      );
      $cmd$
    );
  END IF;

  PERFORM cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'srm-attendance-sync-daily'),
    active := true
  );
END $$;
