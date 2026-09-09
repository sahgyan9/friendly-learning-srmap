-- =============================================================================
-- Add L-T-P-C (Lecture-Tutorial-Practical-Credit) to student_timetables
-- =============================================================================

ALTER TABLE public.student_timetables ADD COLUMN IF NOT EXISTS ltpc text;

GRANT SELECT ON public.student_timetables TO authenticated, anon;
GRANT ALL ON public.student_timetables TO service_role;

-- Backfill existing slots for sahgyan9 from Section 10 metadata
UPDATE public.student_timetables SET ltpc = '2-0-2-4' WHERE course_code IN ('PHY 424', 'PHY 425');
UPDATE public.student_timetables SET ltpc = '3-1-0-4' WHERE course_code = 'PHY 426';

