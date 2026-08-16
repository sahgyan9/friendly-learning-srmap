-- =============================================================================
-- Enrich mentor knowledge chunks for better semantic search relevance
--
-- Two problems being fixed:
--
-- 1. SPARSE CHUNK BODIES: Mentors with short skill lists and no bio were
--    producing bodies like "Name, 3rd year, CSE. Skills: Python." — too little
--    text for the embedding model to produce a distinctive vector. These chunks
--    matched almost everything at similarity ≈ 0.30–0.35, polluting results.
--    Fix: Skills are now written as full sentences ("Proficient in Python,
--    React…"), and expanded phrases use "can help with" framing to better
--    match how students phrase search queries ("who can help with X").
--
-- 2. MISSING bio IN METADATA: The chunk metadata JSON had no 'bio' key, so
--    the search hook fell back to a generic snippet for every mentor semantic
--    hit (the code checked hit.metadata?.bio but it was always undefined).
--    Fix: bio is now included in metadata so the hook can display the
--    mentor's actual bio when available.
--
-- Also raises the p_min_similarity default on search_knowledge from 0.30 →
-- 0.35 to cut out the bottom tier of weak matches that were appearing for
-- broad queries.  The edge function still passes an explicit value, so this
-- only affects callers that omit the parameter (admin tooling etc.).
--
-- The projector and the search_knowledge signature are kept identical — no
-- new columns, no schema changes.  After applying this migration, call
-- rebuild_knowledge_chunks() and then trigger embed-knowledge to re-embed
-- only the rows whose body changed (content_hash detects them).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enriched mentor projector
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_mentor_chunks()
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
      m.id,
      m.name AS title,
      NULLIF(concat_ws(' · ', m.year_of_studies, m.department), '') AS subtitle,
      --
      -- Body is embedded and matched against the student's query.  Each clause
      -- is written as a sentence a student might plausibly search for, so the
      -- embedding lands close to queries like "who can help with React" or
      -- "CSE mentor for machine learning projects".
      --
      concat_ws(' ',
        -- Identity line
        m.name || ', ' || COALESCE(m.year_of_studies, '') || ' student'
          || CASE WHEN m.department IS NOT NULL THEN ' in ' || m.department ELSE '' END || '.',
        -- Skills as a natural sentence so the model treats them as expertise signals
        CASE
          WHEN array_length(m.skills, 1) > 0
          THEN 'Proficient in ' || array_to_string(m.skills, ', ') || '.'
        END,
        -- Explicit help framing — mirrors typical student search phrasing
        CASE
          WHEN array_length(m.skills, 1) > 0
          THEN 'Can help with ' || array_to_string(m.skills, ', ') || '.'
        END,
        -- Bio carries the richest signal if present
        NULLIF(trim(m.bio), ''),
        -- Hobbies / interests broaden topical coverage
        CASE
          WHEN COALESCE(trim(m.hobbies), '') <> ''
          THEN 'Interests include ' || m.hobbies || '.'
        END,
        -- Alumni context: job title and company improve matching for industry queries
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
        'profile_image',   m.profile_image,
        'year_of_studies', m.year_of_studies,
        'is_alumni',       COALESCE(m.is_alumni, false),
        'rating',          m.rating,
        'review_count',    m.review_count,
        -- bio is now included so the search hook can display the real bio
        -- instead of falling back to a generic snippet for every semantic hit.
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
    -- Only invalidate the embedding when the text actually changed.
    -- Rows whose body is identical to before keep their existing vector.
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
$$;

-- -----------------------------------------------------------------------------
-- Also rebuild rebuild_knowledge_chunks so it stays in sync
-- (no change to the faculty projector — it is already good)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_knowledge_chunks()
RETURNS TABLE (entity_type TEXT, rows_upserted INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT 'faculty'::TEXT, public.rebuild_faculty_chunks();
  RETURN QUERY SELECT 'mentor'::TEXT,  public.rebuild_mentor_chunks();
END;
$$;

-- -----------------------------------------------------------------------------
-- Raise the default similarity floor: 0.30 was letting in too many weak matches
-- on broad queries.  0.35 keeps the high-confidence tier and drops the noisy
-- tail that was filling result pages with tangentially related people.
--
-- The edge function passes p_min_similarity explicitly (currently 0.30), so
-- this default does not change live search immediately — update the edge
-- function call if you want to tighten the floor there too.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_knowledge(
  p_embedding      extensions.vector(768),
  p_entity_types   TEXT[]  DEFAULT ARRAY['faculty', 'mentor', 'opportunity', 'community', 'post'],
  p_limit          INTEGER DEFAULT 10,
  p_viewer         UUID    DEFAULT NULL,
  p_min_similarity REAL    DEFAULT 0.35          -- raised from 0.30
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id   UUID,
  title       TEXT,
  subtitle    TEXT,
  metadata    JSONB,
  source_path TEXT,
  similarity  REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT
    kc.entity_type,
    kc.entity_id,
    kc.title,
    kc.subtitle,
    kc.metadata,
    kc.source_path,
    (1 - (kc.embedding <=> p_embedding))::REAL AS similarity
  FROM public.knowledge_chunks kc
  WHERE kc.embedding IS NOT NULL
    AND kc.entity_type = ANY(p_entity_types)
    AND (
      kc.visibility = 'public'
      OR (kc.visibility = 'signed_in' AND p_viewer IS NOT NULL)
    )
    AND (1 - (kc.embedding <=> p_embedding)) >= p_min_similarity
  ORDER BY kc.embedding <=> p_embedding
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
$$;

-- Grants stay the same — no new public surface exposed.
REVOKE ALL ON FUNCTION public.rebuild_mentor_chunks()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rebuild_knowledge_chunks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_knowledge(extensions.vector, TEXT[], INTEGER, UUID, REAL)
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Immediate backfill: run the enriched projector so existing mentor rows get
-- new bodies.  Rows whose body changed will have embedding = NULL and will be
-- re-embedded on the next embed-knowledge run (or trigger it manually from
-- the admin panel / Supabase dashboard).
-- -----------------------------------------------------------------------------
SELECT public.rebuild_mentor_chunks();
