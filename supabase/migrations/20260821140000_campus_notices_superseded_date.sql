-- =============================================================================
-- Campus Notices: superseded_date for holiday reschedules
--
-- When a holiday is rescheduled (category = 'holiday_change'), a circular
-- typically specifies two dates:
--   1. effective_date: the new date the holiday has moved TO
--   2. superseded_date: the original date the holiday moved AWAY from
--
-- This migration adds `superseded_date` to `campus_notices` and updates
-- `public.get_calendar_day(p_date)` so that if a date was vacated by a notice,
-- it is deterministically reported as `is_holiday = false`, overriding the
-- static `academic_calendar_days` table.
-- =============================================================================

ALTER TABLE public.campus_notices
  ADD COLUMN IF NOT EXISTS superseded_date DATE;

CREATE INDEX IF NOT EXISTS idx_campus_notices_superseded_date
  ON public.campus_notices(superseded_date);

-- Ensure anon and authenticated roles retain SELECT on the new column
GRANT SELECT ON public.campus_notices TO anon, authenticated;

-- Backfill any existing EID-Milad-un-Nabi reschedule notice
UPDATE public.campus_notices
SET superseded_date = '2026-08-25'
WHERE category = 'holiday_change'
  AND effective_date = '2026-08-26'
  AND (superseded_date IS NULL OR superseded_date != '2026-08-25');

-- ---------------------------------------------------------------------------
-- Update knowledge_chunks projector to include superseded_date in metadata
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_notice_chunks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  affected INTEGER;
BEGIN
  WITH source AS (
    SELECT
      n.id,
      n.title,
      NULLIF(concat_ws(' · ', initcap(replace(n.category, '_', ' ')), to_char(n.issued_date, 'DD Mon YYYY'), n.reference_no), '') AS subtitle,
      concat_ws('. ',
        n.title,
        n.summary,
        n.content
      ) AS body,
      jsonb_build_object(
        'category', n.category,
        'reference_no', n.reference_no,
        'issued_date', n.issued_date,
        'effective_date', n.effective_date,
        'superseded_date', n.superseded_date,
        'summary', n.summary
      ) AS metadata,
      '/notices/' || n.id AS source_path
    FROM public.campus_notices n
    WHERE n.is_published
  )
  INSERT INTO public.knowledge_chunks
    (entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'notice', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path, md5(s.body)
  FROM source s
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title        = EXCLUDED.title,
    subtitle     = EXCLUDED.subtitle,
    body         = EXCLUDED.body,
    metadata     = EXCLUDED.metadata,
    visibility   = EXCLUDED.visibility,
    source_path  = EXCLUDED.source_path,
    content_hash = EXCLUDED.content_hash,
    embedding    = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                        THEN NULL ELSE public.knowledge_chunks.embedding END,
    embedded_at  = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                        THEN NULL ELSE public.knowledge_chunks.embedded_at END;

  GET DIAGNOSTICS affected = ROW_COUNT;

  DELETE FROM public.knowledge_chunks kc
  WHERE kc.entity_type = 'notice'
    AND NOT EXISTS (
      SELECT 1 FROM public.campus_notices n
      WHERE n.id = kc.entity_id AND n.is_published
    );

  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_notice_chunks() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_calendar_day(): deterministic holiday resolver with superseded_date check
--
-- Priority:
--   1. If a published holiday_change notice has superseded_date = p_date ->
--      force is_holiday = false, source = 'notice_override' (date was vacated).
--   2. Else if a published holiday_change notice has effective_date = p_date ->
--      force is_holiday = true, source = 'notice_override' (holiday moved here).
--   3. Else -> fall back to academic_calendar_days (is_holiday = true, source = 'calendar').
--   4. Else -> 0 rows (ordinary working day / unmodelled).
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
  WITH superseded AS (
    SELECT n.id, n.title, n.summary
    FROM public.campus_notices n
    WHERE n.category = 'holiday_change'
      AND n.is_published
      AND n.superseded_date = p_date
    ORDER BY n.issued_date DESC
    LIMIT 1
  ),
  effective AS (
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
    CASE
      WHEN superseded.id IS NOT NULL THEN false
      WHEN effective.id IS NOT NULL THEN true
      WHEN base.occasion_name IS NOT NULL THEN true
      ELSE false
    END,
    CASE
      WHEN superseded.id IS NOT NULL THEN base.occasion_name
      WHEN effective.id IS NOT NULL THEN COALESCE(base.occasion_name, effective.title)
      ELSE base.occasion_name
    END,
    CASE
      WHEN superseded.id IS NOT NULL THEN 'notice_override'
      WHEN effective.id IS NOT NULL THEN 'notice_override'
      WHEN base.occasion_name IS NOT NULL THEN 'calendar'
      ELSE 'none'
    END,
    COALESCE(superseded.id, effective.id),
    COALESCE(superseded.title, effective.title),
    COALESCE(superseded.summary, effective.summary)
  FROM (SELECT 1) dummy
  LEFT JOIN superseded ON true
  LEFT JOIN effective ON true
  LEFT JOIN base ON true
  WHERE (superseded.id IS NOT NULL) OR (effective.id IS NOT NULL) OR (base.occasion_name IS NOT NULL);
$$;

REVOKE ALL ON FUNCTION public.get_calendar_day(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_calendar_day(date) TO service_role;
