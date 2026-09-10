-- =============================================================================
-- SRM Portal Daily & Today Attendance Storage
--
-- Why this exists:
-- Persists daily period-by-period attendance records from the SRM AP student portal
-- (Section 33 `students/transaction/studentattendance.jsp`).
-- Enables displaying verified period attendance (P/A) directly in the attendance
-- table alongside cumulative standing without screen switching.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.student_daily_attendance (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  register_number     text,
  attendance_date     date NOT NULL,
  day_order           text NOT NULL,
  period_slot         integer NOT NULL,
  course_code         text NOT NULL,
  course_name         text NOT NULL,
  status              text NOT NULL, -- 'P', 'A', 'OD'
  last_synced_at      timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_daily_attendance_slot UNIQUE (user_id, attendance_date, period_slot)
);

CREATE INDEX IF NOT EXISTS idx_student_daily_attendance_user_date ON public.student_daily_attendance (user_id, attendance_date);

ALTER TABLE public.student_daily_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own daily attendance" ON public.student_daily_attendance;
CREATE POLICY "Users can view their own daily attendance"
  ON public.student_daily_attendance FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage daily attendance" ON public.student_daily_attendance;
CREATE POLICY "Service role can manage daily attendance"
  ON public.student_daily_attendance FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.student_daily_attendance TO authenticated, anon;
GRANT ALL ON public.student_daily_attendance TO service_role;
