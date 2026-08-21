-- =============================================================================
-- Campus Notices / Circulars
--
-- Adds public.campus_notices — admin-authored official notices (holiday
-- changes, circulars, exam notices) distinct from public.campus_documents
-- (long parsed handbooks/calendars). Unlike campus_documents, this table is
-- written directly by admins from the browser (RLS-gated), not by a
-- developer-run script.
--
-- Defines public.rebuild_notice_chunks() to project campus_notices into
-- public.knowledge_chunks with entity_type = 'notice', and reprojects
-- immediately on insert/update (same idiom as academic_imports_reproject in
-- 20260808160000_academic_imports.sql) instead of waiting on the hourly
-- rebuild_knowledge_chunks() cron.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.campus_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('holiday_change', 'academic_calendar', 'exam', 'event', 'administrative', 'general')),
  reference_no TEXT,
  issued_date DATE NOT NULL,
  effective_date DATE,
  summary TEXT,
  content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campus_notices_category ON public.campus_notices(category);
CREATE INDEX IF NOT EXISTS idx_campus_notices_published ON public.campus_notices(is_published);
CREATE INDEX IF NOT EXISTS idx_campus_notices_issued_date ON public.campus_notices(issued_date DESC);

-- Row Level Security
ALTER TABLE public.campus_notices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campus_notices'
      AND policyname = 'Anyone can view published campus notices'
  ) THEN
    CREATE POLICY "Anyone can view published campus notices"
      ON public.campus_notices
      FOR SELECT
      USING (is_published = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campus_notices'
      AND policyname = 'Admins can insert campus notices'
  ) THEN
    CREATE POLICY "Admins can insert campus notices"
      ON public.campus_notices
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin_user(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campus_notices'
      AND policyname = 'Admins can update campus notices'
  ) THEN
    CREATE POLICY "Admins can update campus notices"
      ON public.campus_notices
      FOR UPDATE
      TO authenticated
      USING (public.is_admin_user(auth.uid()))
      WITH CHECK (public.is_admin_user(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campus_notices'
      AND policyname = 'Admins can delete campus notices'
  ) THEN
    CREATE POLICY "Admins can delete campus notices"
      ON public.campus_notices
      FOR DELETE
      TO authenticated
      USING (public.is_admin_user(auth.uid()));
  END IF;
END $$;

-- Permissions. INSERT/UPDATE/DELETE are granted to authenticated because RLS
-- (via is_admin_user) is the actual gate — matches the pattern already used
-- for mentor-application-flag writes (20250815121408_...:330,337).
GRANT SELECT ON public.campus_notices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campus_notices TO authenticated;
GRANT ALL ON public.campus_notices TO service_role;

-- updated_at bookkeeping
CREATE OR REPLACE FUNCTION public.campus_notices_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campus_notices_updated_at ON public.campus_notices;
CREATE TRIGGER trg_campus_notices_updated_at
  BEFORE UPDATE ON public.campus_notices
  FOR EACH ROW EXECUTE FUNCTION public.campus_notices_set_updated_at();

-- Projector function for knowledge_chunks
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

-- An admin-created notice shouldn't wait for the hourly rebuild_knowledge_chunks()
-- cron to show up in /ask — reproject immediately, same idiom as
-- academic_imports_reproject (20260808160000_academic_imports.sql:194-214).
CREATE OR REPLACE FUNCTION public.campus_notices_reproject()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  PERFORM public.rebuild_notice_chunks();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_campus_notices_reproject ON public.campus_notices;
CREATE TRIGGER trg_campus_notices_reproject
  AFTER INSERT OR UPDATE ON public.campus_notices
  FOR EACH STATEMENT EXECUTE FUNCTION public.campus_notices_reproject();

REVOKE ALL ON FUNCTION public.campus_notices_reproject() FROM PUBLIC, anon, authenticated;

-- Master rebuild function update. DROP first: CREATE OR REPLACE rejects an
-- OUT-parameter rename ("cannot change return type of existing function"),
-- same issue campus_documents.sql hit and fixed the same way.
DROP FUNCTION IF EXISTS public.rebuild_knowledge_chunks();

CREATE OR REPLACE FUNCTION public.rebuild_knowledge_chunks()
RETURNS TABLE(entity TEXT, count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT 'faculty'::TEXT, public.rebuild_faculty_chunks();
  RETURN QUERY SELECT 'mentor'::TEXT,  public.rebuild_mentor_chunks();
  RETURN QUERY SELECT 'opportunity'::TEXT, public.rebuild_opportunity_chunks();
  RETURN QUERY SELECT 'document'::TEXT, public.rebuild_document_chunks();
  RETURN QUERY SELECT 'notice'::TEXT, public.rebuild_notice_chunks();
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_knowledge_chunks() FROM PUBLIC, anon, authenticated;
