-- =============================================================================
-- Campus Documents & Handbooks Indexing
--
-- Adds public.campus_documents as the source table for official university
-- policies, handbooks, regulations, and academic calendars.
-- Defines public.rebuild_document_chunks() to project documents into
-- public.knowledge_chunks with entity_type = 'document'.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.campus_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_slug TEXT NOT NULL,
  document_title TEXT NOT NULL,
  academic_year TEXT DEFAULT '2026-27',
  category TEXT NOT NULL,
  section_heading TEXT NOT NULL,
  content TEXT NOT NULL,
  page_number INT,
  source_filename TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for fast lookups
CREATE INDEX IF NOT EXISTS idx_campus_documents_slug ON public.campus_documents(document_slug);
CREATE INDEX IF NOT EXISTS idx_campus_documents_category ON public.campus_documents(category);
CREATE INDEX IF NOT EXISTS idx_campus_documents_published ON public.campus_documents(is_published);

-- Row Level Security
ALTER TABLE public.campus_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campus_documents' 
      AND policyname = 'Anyone can view published campus documents'
  ) THEN
    CREATE POLICY "Anyone can view published campus documents"
      ON public.campus_documents
      FOR SELECT
      USING (is_published = true);
  END IF;
END $$;

-- Permissions
GRANT SELECT ON public.campus_documents TO anon, authenticated;
GRANT ALL ON public.campus_documents TO service_role;

-- Projector function for knowledge_chunks
CREATE OR REPLACE FUNCTION public.rebuild_document_chunks()
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
      d.id,
      d.document_title || ': ' || d.section_heading AS title,
      NULLIF(concat_ws(' · ', d.academic_year, initcap(replace(d.category, '_', ' ')), CASE WHEN d.page_number IS NOT NULL THEN 'Page ' || d.page_number ELSE NULL END), '') AS subtitle,
      concat_ws('. ',
        d.document_title,
        d.section_heading,
        d.content
      ) AS body,
      jsonb_build_object(
        'slug', d.document_slug,
        'document_title', d.document_title,
        'category', d.category,
        'academic_year', d.academic_year,
        'section_heading', d.section_heading,
        'page_number', d.page_number,
        'source_filename', d.source_filename
      ) AS metadata,
      '/documents/' || d.document_slug AS source_path
    FROM public.campus_documents d
    WHERE d.is_published
  )
  INSERT INTO public.knowledge_chunks
    (entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'document', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path, md5(s.body)
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
  WHERE kc.entity_type = 'document'
    AND NOT EXISTS (
      SELECT 1 FROM public.campus_documents d
      WHERE d.id = kc.entity_id AND d.is_published
    );

  RETURN affected;
END;
$$;

DROP FUNCTION IF EXISTS public.rebuild_knowledge_chunks();

-- Master rebuild function update
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
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_document_chunks() FROM PUBLIC, anon, authenticated;
