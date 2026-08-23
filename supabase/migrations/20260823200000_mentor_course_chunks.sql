-- Mentors' "Courses Taken" list (public.mentors.courses, added in
-- 20260808170000_mentor_courses.sql) was never folded into the text that
-- gets embedded for semantic search. A mentor who has taken, say,
-- "Foundations of Data Analytics" and lists it on their profile is
-- invisible to a search for that course.
--
-- NOTE ON SCHEMA: 20260817000000_multi_chunk_indexing.sql ("Phase 4:
-- Multi-Chunk Indexing") is in the repo's migration history but was never
-- actually applied to production -- confirmed 2026-08-23 by reading the
-- live schema (public.knowledge_chunks has no chunk_index column; its only
-- unique constraint is still (entity_type, entity_id)) and the live
-- rebuild_mentor_chunks() body (pg_get_functiondef), which matches the
-- pre-multi-chunk shape from 20260816090000_enrich_mentor_chunks.sql: one
-- combined chunk per mentor, not the "main" + "skill_N" split the repo's
-- later migrations assume. The hourly rebuild-knowledge-chunks-hourly cron
-- is running fine against this older shape (verified via
-- cron.job_run_details: 10/10 recent runs succeeded) -- production is just
-- quietly behind the repo, not broken. That drift is a separate, pre-
-- existing issue and out of scope here.
--
-- This migration therefore targets the schema that is actually live: it
-- redefines rebuild_mentor_chunks() to add a courses sentence into the
-- SAME single per-mentor chunk, mirroring exactly how the live function
-- already folds in skills ("Proficient in X, Y. Can help with X, Y."). It
-- does NOT attempt to add chunk_index or per-course chunks -- that would
-- require deploying the missing multi-chunk migration first, which is a
-- separate, bigger decision (deliberately deferred; see conversation with
-- Gyan 2026-08-23).
--
-- Trade-off accepted: with up to 80 courses (mentors_courses_limit) folded
-- into one blob alongside bio/skills/hobbies, a specific course's signal in
-- the resulting embedding is diluted compared to faculty's one-chunk-per-
-- research-interest pattern. Still a large improvement over the status quo
-- (zero signal), and safe to upgrade later once/if multi-chunk indexing is
-- properly deployed.

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
        'department',      m.department,
        'skills',          to_jsonb(COALESCE(m.skills, ARRAY[]::text[])),
        'courses',         COALESCE(m.courses, '[]'::jsonb),
        'profile_image',   m.profile_image,
        'year_of_studies', m.year_of_studies,
        'is_alumni',       COALESCE(m.is_alumni, false),
        'rating',          m.rating,
        'review_count',    m.review_count,
        'bio',             NULLIF(trim(m.bio), '')
      ) AS metadata,
      '/mentor/' || m.id AS source_path
    FROM public.mentors m
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

-- Backfill immediately rather than waiting for the hourly
-- rebuild-knowledge-chunks-hourly cron, so existing mentors with courses
-- already on their profile (e.g. Gyan Kumar Sah) become searchable now.
SELECT public.rebuild_mentor_chunks();
