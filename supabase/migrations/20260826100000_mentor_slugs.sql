-- =============================================================================
-- Migration: Add slug column and auto-generation trigger for mentors
-- Enables SEO-friendly human-readable URLs (e.g. /mentor/gyan-kumar-sah)
-- =============================================================================

-- 1. Add slug column if it does not already exist
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS slug text;

-- 2. Trigger function to auto-generate unique slug from mentor name
CREATE OR REPLACE FUNCTION public.mentors_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base TEXT;
  v_slug TEXT;
  v_n    INT := 1;
BEGIN
  -- If updating and name hasn't changed and slug is already present, leave it alone
  IF TG_OP = 'UPDATE' AND NEW.name = OLD.name AND NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  v_base := public.slugify(NEW.name);
  IF v_base = '' THEN v_base := 'mentor'; END IF;

  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM public.mentors m WHERE m.slug = v_slug AND m.id <> NEW.id) LOOP
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  END LOOP;

  NEW.slug := v_slug;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.mentors_set_slug() IS
  'Generates a unique url slug from mentor name using public.slugify.';

DROP TRIGGER IF EXISTS trg_mentors_set_slug ON public.mentors;
CREATE TRIGGER trg_mentors_set_slug
  BEFORE INSERT OR UPDATE ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.mentors_set_slug();

-- 3. Backfill all existing mentors
DO $$
DECLARE
  r RECORD;
  v_base TEXT;
  v_slug TEXT;
  v_n INT;
BEGIN
  FOR r IN SELECT id, name FROM public.mentors WHERE slug IS NULL OR slug = '' LOOP
    v_base := public.slugify(r.name);
    IF v_base = '' THEN v_base := 'mentor'; END IF;
    v_slug := v_base;
    v_n := 1;
    WHILE EXISTS (SELECT 1 FROM public.mentors m WHERE m.slug = v_slug AND m.id <> r.id) LOOP
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    END LOOP;
    UPDATE public.mentors SET slug = v_slug WHERE id = r.id;
  END LOOP;
END;
$$;

-- 4. Create unique index for fast lookups and integrity
CREATE UNIQUE INDEX IF NOT EXISTS mentors_slug_idx ON public.mentors (slug);

-- 5. Explicitly grant SELECT on the new column to anon and authenticated
GRANT SELECT (slug) ON public.mentors TO anon, authenticated;

-- 6. Update rebuild_mentor_chunks() to use clean slug in source_path and metadata
CREATE OR REPLACE FUNCTION public.rebuild_mentor_chunks()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  affected INTEGER;
BEGIN
  WITH source AS (
    SELECT
      m.id,
      m.name AS title,
      NULLIF(concat_ws(' · ', m.year_of_studies, m.department), '') AS subtitle,
      concat_ws(' ',
        m.name || ', ' || COALESCE(m.year_of_studies, '') || ' student'
          || CASE WHEN m.department IS NOT NULL THEN ' in ' || m.department ELSE '' END || '.',
        CASE
          WHEN array_length(m.skills, 1) > 0
          THEN 'Proficient in ' || array_to_string(m.skills, ', ') || '.'
        END,
        CASE
          WHEN array_length(m.skills, 1) > 0
          THEN 'Can help with ' || array_to_string(m.skills, ', ') || '.'
        END,
        CASE
          WHEN jsonb_array_length(COALESCE(m.courses, '[]'::jsonb)) > 0
          THEN 'Completed coursework: ' || (
                 SELECT string_agg(c->>'name', ', ')
                 FROM jsonb_array_elements(m.courses) c
                 WHERE NULLIF(trim(c->>'name'), '') IS NOT NULL
               ) || '.'
          WHEN jsonb_array_length(COALESCE(ai.subjects, '[]'::jsonb)) > 0
          THEN 'Completed coursework: ' || (
                 SELECT string_agg(DISTINCT subj->>'name', ', ')
                 FROM jsonb_array_elements(COALESCE(ai.subjects, '[]'::jsonb)) subj
                 WHERE NULLIF(trim(subj->>'name'), '') IS NOT NULL
               ) || '.'
        END,
        NULLIF(trim(m.bio), ''),
        CASE
          WHEN COALESCE(trim(m.hobbies), '') <> ''
          THEN 'Interests include ' || m.hobbies || '.'
        END,
        CASE
          WHEN m.is_alumni IS TRUE
          THEN 'Alumni'
            || NULLIF(' now ' || m.job_title, ' now ')
            || NULLIF(' at ' || m.company, ' at ')
            || '.'
        END
      ) AS body,
      jsonb_build_object(
        'slug',            m.slug,
        'department',      m.department,
        'skills',          to_jsonb(COALESCE(m.skills, ARRAY[]::text[])),
        'courses',         COALESCE(m.courses, '[]'::jsonb),
        'profile_image',   m.profile_image,
        'year_of_studies', m.year_of_studies,
        'is_alumni',       COALESCE(m.is_alumni, false),
        'rating',          m.rating,
        'review_count',    m.review_count,
        'verified_cgpa',   ai.cgpa,
        'verified_program', ai.program,
        'bio',             NULLIF(trim(m.bio), '')
      ) AS metadata,
      '/mentor/' || COALESCE(m.slug, m.id::text) AS source_path
    FROM public.mentors m
    LEFT JOIN public.academic_imports ai
      ON ai.user_id = m.id AND ai.sync_status = 'success'
    WHERE m.department IS NOT NULL AND m.department <> 'General'
  )
  INSERT INTO public.knowledge_chunks
    (entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'mentor', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path,
         md5(s.body)
  FROM source s
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title        = EXCLUDED.title,
    subtitle     = EXCLUDED.subtitle,
    body         = EXCLUDED.body,
    metadata     = EXCLUDED.metadata,
    visibility   = EXCLUDED.visibility,
    source_path  = EXCLUDED.source_path,
    content_hash = EXCLUDED.content_hash,
    embedding    = CASE
                     WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                     THEN NULL
                     ELSE public.knowledge_chunks.embedding
                   END,
    embedded_at  = CASE
                     WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                     THEN NULL
                     ELSE public.knowledge_chunks.embedded_at
                   END;

  GET DIAGNOSTICS affected = ROW_COUNT;

  DELETE FROM public.knowledge_chunks kc
  WHERE kc.entity_type = 'mentor'
    AND NOT EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.id = kc.entity_id AND m.department IS NOT NULL AND m.department <> 'General'
    );

  RETURN affected;
END;
$function$;

REVOKE ALL ON FUNCTION public.rebuild_mentor_chunks() FROM PUBLIC, anon, authenticated;

-- Backfill chunks immediately so search results point to new slugs
SELECT public.rebuild_mentor_chunks();
