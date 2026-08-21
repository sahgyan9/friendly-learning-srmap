-- =============================================================================
-- Knowledge Articles
--
-- Adds public.knowledge_articles — admin-authored, rich-text reference content
-- (policies, leadership, event history, and similar long-form material) that
-- an admin writes and formats from the browser, unlike public.campus_documents
-- (same kind of content, but only a developer-run script can write to it).
--
-- Structurally this is campus_notices' pipeline (20260821110000_campus_notices.sql)
-- applied to undated long-form content instead of dated circulars: same RLS
-- shape, same immediate-reproject-on-write trigger idiom, same content_hash
-- cache-busting so edits get re-embedded automatically.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  content_html TEXT NOT NULL,
  content_text TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category ON public.knowledge_articles(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_published ON public.knowledge_articles(is_published);

-- Row Level Security
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'knowledge_articles'
      AND policyname = 'Anyone can view published knowledge articles'
  ) THEN
    CREATE POLICY "Anyone can view published knowledge articles"
      ON public.knowledge_articles
      FOR SELECT
      USING (is_published = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'knowledge_articles'
      AND policyname = 'Admins can view unpublished knowledge articles'
  ) THEN
    -- Postgres unions multiple permissive SELECT policies with OR, so this is
    -- additive to "Anyone can view published..." above, not a replacement —
    -- the admin list page needs to see drafts too (same fix campus_notices
    -- needed in 20260821130000_campus_notices_admin_preview.sql).
    CREATE POLICY "Admins can view unpublished knowledge articles"
      ON public.knowledge_articles
      FOR SELECT
      TO authenticated
      USING (public.is_admin_user(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'knowledge_articles'
      AND policyname = 'Admins can insert knowledge articles'
  ) THEN
    CREATE POLICY "Admins can insert knowledge articles"
      ON public.knowledge_articles
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin_user(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'knowledge_articles'
      AND policyname = 'Admins can update knowledge articles'
  ) THEN
    CREATE POLICY "Admins can update knowledge articles"
      ON public.knowledge_articles
      FOR UPDATE
      TO authenticated
      USING (public.is_admin_user(auth.uid()))
      WITH CHECK (public.is_admin_user(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'knowledge_articles'
      AND policyname = 'Admins can delete knowledge articles'
  ) THEN
    CREATE POLICY "Admins can delete knowledge articles"
      ON public.knowledge_articles
      FOR DELETE
      TO authenticated
      USING (public.is_admin_user(auth.uid()));
  END IF;
END $$;

-- Permissions. INSERT/UPDATE/DELETE are granted to authenticated because RLS
-- (via is_admin_user) is the actual gate — same pattern as campus_notices
-- (20260821110000_campus_notices.sql:91-96).
GRANT SELECT ON public.knowledge_articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.knowledge_articles TO authenticated;
GRANT ALL ON public.knowledge_articles TO service_role;

-- updated_at bookkeeping
CREATE OR REPLACE FUNCTION public.knowledge_articles_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_knowledge_articles_updated_at ON public.knowledge_articles;
CREATE TRIGGER trg_knowledge_articles_updated_at
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.knowledge_articles_set_updated_at();

-- Projector function for knowledge_chunks. content_text is a plain-text
-- extraction done client-side (Tiptap's editor.getText()) at save time, not
-- HTML-stripped here in SQL — content_html is kept only for future
-- editing/display, it is never embedded.
CREATE OR REPLACE FUNCTION public.rebuild_article_chunks()
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
      a.id,
      a.title,
      NULLIF(initcap(replace(a.category, '_', ' ')), '') AS subtitle,
      concat_ws('. ', a.title, a.content_text) AS body,
      jsonb_build_object('slug', a.slug, 'category', a.category) AS metadata,
      '/articles/' || a.slug AS source_path
    FROM public.knowledge_articles a
    WHERE a.is_published
  )
  INSERT INTO public.knowledge_chunks
    (entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'article', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path, md5(s.body)
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
  WHERE kc.entity_type = 'article'
    AND NOT EXISTS (
      SELECT 1 FROM public.knowledge_articles a
      WHERE a.id = kc.entity_id AND a.is_published
    );

  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_article_chunks() FROM PUBLIC, anon, authenticated;

-- An admin-created or -edited article shouldn't wait for the hourly
-- rebuild_knowledge_chunks() cron to show up in /ask — reproject immediately,
-- same idiom as campus_notices_reproject (20260821110000_campus_notices.sql:180-197).
CREATE OR REPLACE FUNCTION public.knowledge_articles_reproject()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  PERFORM public.rebuild_article_chunks();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_knowledge_articles_reproject ON public.knowledge_articles;
CREATE TRIGGER trg_knowledge_articles_reproject
  AFTER INSERT OR UPDATE ON public.knowledge_articles
  FOR EACH STATEMENT EXECUTE FUNCTION public.knowledge_articles_reproject();

REVOKE ALL ON FUNCTION public.knowledge_articles_reproject() FROM PUBLIC, anon, authenticated;

-- Master rebuild function update. DROP first: CREATE OR REPLACE rejects an
-- OUT-parameter rename ("cannot change return type of existing function"),
-- same issue campus_documents.sql and campus_notices.sql hit and fixed the
-- same way.
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
  RETURN QUERY SELECT 'article'::TEXT, public.rebuild_article_chunks();
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_knowledge_chunks() FROM PUBLIC, anon, authenticated;
