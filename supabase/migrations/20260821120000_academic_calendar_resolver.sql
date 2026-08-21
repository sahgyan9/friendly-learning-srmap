-- =============================================================================
-- Academic calendar resolver -- deterministic holiday/occasion lookup
--
-- Root cause of the "why is today a holiday" bug: asking an LLM to read a
-- compressed working-days grid (cells marked 'H' with no date printed next
-- to them) *and* cross-reference a separate Occasion/Festival table on the
-- same page is a computation, not a comprehension task -- exactly the class
-- of thing this file's ancestor documents already promise Postgres should
-- do instead of the model (see FACULTY_AI_ROADMAP.md, "retrieve, then
-- explain"). This table is the "retrieve" half for calendar dates: an exact
-- day -> occasion dictionary, hand-verified against
-- University_Data/Academic Calendar AY2026-27.pdf pages 3-4 (not against the
-- ingested campus_documents text, which turned out to be corrupted -- see
-- below).
--
-- Deliberately excludes day_order / full working-vs-non-working status for
-- every calendar day. That data exists in the source PDF as a compressed
-- grid (per-weekday columns of dates, with sporadic highlighted "make-up"
-- Saturdays/Mondays) and reconstructing all ~330 days of it by hand risks
-- exactly the kind of silent transcription error this migration exists to
-- eliminate. tools/process_university_data.py now extracts with
-- get_text(sort=True) so a future automated pass can populate that
-- correctly; until then this table's scope is holidays/occasions only,
-- which is what the reported bug actually needed.
--
-- The campus_documents row for this same page (document_slug =
-- 'academic-calendar-2026-27', page_number = 3) was independently found to
-- be corrupted: get_text()'s default (non-sort) reading order interleaved
-- the page's two side-by-side tables (Occasion/Festival vs. "Festivals on
-- Saturday & Sunday") and silently dropped the first row -- Varalakshmi
-- Vratam, 21.08.2026 -- which is the exact fact the original bug report was
-- about. page_number = 4 (Even Semester) was worse: none of its stored
-- occasion names or dates match the source PDF at all (e.g. stored
-- "Makara Sankranti"/"Maha Shivaratri" do not appear in the document; real
-- entries like Pongal, Ramzan, Ugadi are missing entirely). Both are
-- corrected below so RAG answers stop being wrong even before this
-- resolver is consulted.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Fix the corrupted campus_documents rows (see comment above). Content is
-- re-transcribed directly from the source PDF pages, this time preserving
-- both tables and every row.
-- ---------------------------------------------------------------------------
UPDATE public.campus_documents
SET content = 'Working Days for the Odd Semester -AY 2026-27. '
  || 'Total Working Days for Odd Semester: 96 (Monday-Friday) + 1 Saturday = 97. '
  || 'List of Holidays for the Odd Semester - AY 2026-27: '
  || '1. Varalakshmi Vratam - 21.08.2026 (Friday). '
  || '2. Eid Milad-Un-Nabi - 25.08.2026 (Tuesday). '
  || '3. Sri Krishna Astami - 04.09.2026 (Friday). '
  || '4. Vinayaka Chavithi - 14.09.2026 (Monday). '
  || '5. Mahatma Gandhi Jayanthi - 02.10.2026 (Friday). '
  || '6. Vijayadasami/Dussehra - 20.10.2026 (Tuesday). '
  || '7. Guru Nanak Jayanthi/Karthika Purnima - 24.11.2026 (Tuesday). '
  || '8. Christmas - 25.12.2026 (Friday). '
  || 'The following festivals occur on a Saturday or Sunday and do not reduce working days: '
  || '1. Independence Day - 15.08.2026 (Saturday). '
  || '2. Durgashtami - 18.10.2026 (Sunday). '
  || '3. Deepavali - 08.11.2026 (Sunday). '
  || 'Note: Holidays are subject to change as per AP Government notification.',
  updated_at = now()
WHERE document_slug = 'academic-calendar-2026-27' AND page_number = 3;

UPDATE public.campus_documents
SET content = 'Working Days for the Even Semester -AY 2026-27. '
  || 'Total Working Days for Even Semester: 91 (Monday-Friday) + 2 Saturdays. '
  || 'List of Holidays for the Even Semester - AY 2026-27: '
  || '1. Bhogi - 14.01.2027 (Thursday). '
  || '2. Pongal/Sankranthi - 15.01.2027 (Friday). '
  || '3. Republic Day - 26.01.2027 (Tuesday). '
  || '4. Ramzan (Eid-Ul-Fitr) - 10.03.2027 (Wednesday). '
  || '5. Holi - 22.03.2027 (Monday). '
  || '6. Good Friday - 26.03.2027 (Friday). '
  || E'7. Babu Jagjivan Ram\'s Birthday - 05.04.2027 (Monday). '
  || '8. Ugadi - 08.04.2027 (Thursday). '
  || E'9. Dr. B.R. Ambedkar\'s Birthday - 14.04.2027 (Wednesday). '
  || '10. Sri Rama Navami - 15.04.2027 (Thursday). '
  || '11. Bakrid (Eid-Ul-Zuha) - 17.05.2027 (Monday). '
  || '12. Muharram - 15.06.2027 (Tuesday). '
  || 'The following festival occurs on a Saturday and does not reduce working days: '
  || '1. Kanuma - 16.01.2027 (Saturday). '
  || 'Note: Holidays are subject to change as per AP Government notification.',
  updated_at = now()
WHERE document_slug = 'academic-calendar-2026-27' AND page_number = 4;

-- ---------------------------------------------------------------------------
-- academic_calendar_days: one row per declared holiday/occasion. Not one row
-- per calendar day -- see the scope note above. A date with no row here is
-- either a working day or simply not yet modelled; callers must not treat
-- "no row" as proof of "working day".
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_calendar_days (
  calendar_date    DATE NOT NULL,
  academic_year    TEXT NOT NULL,
  semester         TEXT NOT NULL CHECK (semester IN ('Odd', 'Even')),
  occasion_name    TEXT NOT NULL,
  is_holiday       BOOLEAN NOT NULL DEFAULT true,
  reduces_working_days BOOLEAN NOT NULL DEFAULT true,
  source_document_id UUID REFERENCES public.campus_documents(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (calendar_date, occasion_name)
);

CREATE INDEX IF NOT EXISTS idx_academic_calendar_days_year ON public.academic_calendar_days(academic_year);

ALTER TABLE public.academic_calendar_days ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'academic_calendar_days'
      AND policyname = 'Anyone can view academic calendar days'
  ) THEN
    CREATE POLICY "Anyone can view academic calendar days"
      ON public.academic_calendar_days
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Read-only from the client, same posture as campus_documents: populated by
-- a developer-run script/migration, not written to from the app.
GRANT SELECT ON public.academic_calendar_days TO anon, authenticated;
GRANT ALL ON public.academic_calendar_days TO service_role;

INSERT INTO public.academic_calendar_days
  (calendar_date, academic_year, semester, occasion_name, reduces_working_days, source_document_id, notes)
SELECT v.calendar_date, '2026-27', v.semester, v.occasion_name, v.reduces_working_days, d.id, v.notes
FROM (VALUES
  -- Odd Semester -- verified against page 3 of the source PDF, cross-checked
  -- cell-by-cell against the working-days grid (every 'H' maps to exactly
  -- one row here and vice versa). Two rows correct an evident typo in the
  -- source PDF: it prints "2027" for these two, but the printed day-of-week
  -- ('Tuesday'/'Friday') only matches 2026, not 2027, for that date.
  ('2026-08-21'::date, 'Odd', 'Varalakshmi Vratam', true, NULL::text),
  ('2026-08-25'::date, 'Odd', 'Eid Milad-Un-Nabi', true, 'Source PDF prints 25.08.2027; day-of-week (Tuesday) only matches 2026.'),
  ('2026-09-04'::date, 'Odd', 'Sri Krishna Astami', true, NULL),
  ('2026-09-14'::date, 'Odd', 'Vinayaka Chavithi', true, NULL),
  ('2026-10-02'::date, 'Odd', 'Mahatma Gandhi Jayanthi', true, 'Source PDF prints 02.10.2027; day-of-week (Friday) only matches 2026.'),
  ('2026-10-20'::date, 'Odd', 'Vijayadasami/Dussehra', true, NULL),
  ('2026-11-24'::date, 'Odd', 'Guru Nanak Jayanthi/Karthika Purnima', true, NULL),
  ('2026-12-25'::date, 'Odd', 'Christmas', true, NULL),
  ('2026-08-15'::date, 'Odd', 'Independence Day', false, 'Falls on a Saturday; does not reduce working-day count.'),
  ('2026-10-18'::date, 'Odd', 'Durgashtami', false, 'Falls on a Sunday; does not reduce working-day count.'),
  ('2026-11-08'::date, 'Odd', 'Deepavali', false, 'Falls on a Sunday; does not reduce working-day count.'),
  -- Even Semester -- verified against page 4 of the source PDF the same way.
  ('2027-01-14'::date, 'Even', 'Bhogi', true, NULL),
  ('2027-01-15'::date, 'Even', 'Pongal/Sankranthi', true, NULL),
  ('2027-01-26'::date, 'Even', 'Republic Day', true, NULL),
  ('2027-03-10'::date, 'Even', 'Ramzan (Eid-Ul-Fitr)', true, NULL),
  ('2027-03-22'::date, 'Even', 'Holi', true, NULL),
  ('2027-03-26'::date, 'Even', 'Good Friday', true, NULL),
  ('2027-04-05'::date, 'Even', 'Babu Jagjivan Ram''s Birthday', true, NULL),
  ('2027-04-08'::date, 'Even', 'Ugadi', true, NULL),
  ('2027-04-14'::date, 'Even', 'Dr. B.R. Ambedkar''s Birthday', true, NULL),
  ('2027-04-15'::date, 'Even', 'Sri Rama Navami', true, NULL),
  ('2027-05-17'::date, 'Even', 'Bakrid (Eid-Ul-Zuha)', true, NULL),
  ('2027-06-15'::date, 'Even', 'Muharram', true, NULL),
  ('2027-01-16'::date, 'Even', 'Kanuma', false, 'Falls on a Saturday; does not reduce working-day count.')
) AS v(calendar_date, semester, occasion_name, reduces_working_days, notes)
LEFT JOIN LATERAL (
  -- LEFT, not inner: campus_documents may not have this row yet (e.g. in the
  -- migration test harness, which never seeds it) -- source_document_id is
  -- a citation nicety, not something the row's existence should depend on.
  SELECT id FROM public.campus_documents
  WHERE document_slug = 'academic-calendar-2026-27'
    AND page_number = (CASE WHEN v.semester = 'Odd' THEN 3 ELSE 4 END)
  LIMIT 1
) d ON true
ON CONFLICT (calendar_date, occasion_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- get_calendar_day(): the deterministic answer for "is <date> a holiday, and
-- why". campus_notices with category = 'holiday_change' and a matching
-- effective_date override the static table -- an admin posting a holiday
-- reschedule takes effect here immediately, without re-deriving this table.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_calendar_day(p_date date)
RETURNS TABLE (
  calendar_date date,
  is_holiday boolean,
  occasion_name text,
  source text,          -- 'calendar' | 'notice_override' | 'none'
  notice_id uuid,
  notice_title text,
  notice_summary text
)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  WITH override AS (
    SELECT n.id, n.title, n.summary
    FROM public.campus_notices n
    WHERE n.category = 'holiday_change'
      AND n.is_published
      AND n.effective_date = p_date
    ORDER BY n.issued_date DESC
    LIMIT 1
  ),
  base AS (
    SELECT c.occasion_name
    FROM public.academic_calendar_days c
    WHERE c.calendar_date = p_date
    ORDER BY c.occasion_name
    LIMIT 1
  )
  SELECT
    p_date,
    (override.id IS NOT NULL) OR (base.occasion_name IS NOT NULL),
    COALESCE(base.occasion_name, CASE WHEN override.id IS NOT NULL THEN override.title END),
    CASE
      WHEN override.id IS NOT NULL THEN 'notice_override'
      WHEN base.occasion_name IS NOT NULL THEN 'calendar'
      ELSE 'none'
    END,
    override.id,
    override.title,
    override.summary
  FROM base
  FULL OUTER JOIN override ON true;
$$;

REVOKE ALL ON FUNCTION public.get_calendar_day(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_calendar_day(date) TO service_role;
