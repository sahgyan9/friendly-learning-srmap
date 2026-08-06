-- =============================================================================
-- knowledge_chunks — the retrieval layer behind topic search and the assistant
--
-- One table that every searchable thing projects into, so that adding a new
-- searchable entity later is a projector function and nothing else. No new AI
-- integration, no change to the embedding job, no change to the search RPC.
-- That is the whole point: the expensive work happens once, here.
--
-- DERIVED, NEVER AUTHORITATIVE. public.faculty and public.mentors stay the
-- truth. This table can be dropped and rebuilt from them at any time with
-- rebuild_knowledge_chunks(). Never write to it by hand and never treat it as a
-- source of record.
--
-- WHY NOT TRAIN A MODEL ON THIS. Recorded here because the question will come
-- back: fine-tuning teaches a model style, not facts, and these facts change
-- weekly. A trained model freezes a snapshot and then states outdated things
-- confidently about named employees of a university. Retrieval keeps answers
-- current and lets every claim be traced to the row it came from.
--
-- PRIVACY. What goes in `body` becomes searchable and is quoted back to
-- students. mentors.mobile and mentors.cgpa are deliberately excluded, as is
-- faculty.email. Reviewer identity from faculty_ratings must never appear here
-- in any form — the anonymity guarantee in 20260726010000 has no exceptions.
-- =============================================================================

-- pgvector lives in `extensions`, matching every other extension on this
-- project. Consequence: anything touching the vector type or its operators
-- needs `extensions` on its search_path, hence the SET on each function below.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 'faculty' | 'mentor' today. Deliberately TEXT, not an enum: adding a type
  -- should not require an ALTER TYPE that locks the table.
  entity_type  TEXT NOT NULL,
  entity_id    UUID NOT NULL,

  title        TEXT NOT NULL,
  subtitle     TEXT,
  -- The text that actually gets embedded and matched against.
  body         TEXT NOT NULL,
  -- Display/filter data the search results need without a second query.
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Filtered in SQL before anything reaches a model. The single most important
  -- column here: it is how a private group's contents stay out of an answer.
  visibility   TEXT NOT NULL DEFAULT 'public'
               CHECK (visibility IN ('public', 'signed_in', 'members_only')),

  source_path  TEXT,

  -- Change detection. The projector recomputes this; when it differs the
  -- embedding is cleared, so the embed job re-embeds exactly the rows whose
  -- text actually changed instead of the whole table.
  content_hash TEXT NOT NULL,

  -- 768 dimensions. embed-knowledge pins outputDimensionality=768 so the model
  -- can be swapped without an ALTER TABLE, as long as the replacement supports
  -- that parameter. Changing this number means re-embedding everything.
  embedding    extensions.vector(768),
  embedded_at  TIMESTAMPTZ,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_pending
  ON public.knowledge_chunks (entity_type) WHERE embedding IS NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_type_vis
  ON public.knowledge_chunks (entity_type, visibility);

-- HNSW rather than IVFFlat: no training step, so it is correct on an empty
-- table and stays correct as rows arrive. Cosine distance, matching the
-- normalised embeddings the API returns.
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON public.knowledge_chunks USING hnsw (embedding extensions.vector_cosine_ops);

DROP TRIGGER IF EXISTS trg_knowledge_chunks_touch ON public.knowledge_chunks;
CREATE TRIGGER trg_knowledge_chunks_touch
  BEFORE UPDATE ON public.knowledge_chunks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
--
-- No policy is granted to anon or authenticated at all. This table is an index,
-- not an API: it holds every chunk regardless of visibility, so exposing it
-- directly would hand out exactly what `visibility` exists to withhold. All
-- reads go through search_knowledge() below, which filters first. The embed job
-- uses the service role, which bypasses RLS.
-- -----------------------------------------------------------------------------
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can inspect knowledge chunks" ON public.knowledge_chunks;
CREATE POLICY "Admins can inspect knowledge chunks"
  ON public.knowledge_chunks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

REVOKE ALL ON public.knowledge_chunks FROM anon;

-- -----------------------------------------------------------------------------
-- Projectors
--
-- Each one owns the question "what text represents this entity, and who may see
-- it". Adding a searchable entity type = write one of these + call it from
-- rebuild_knowledge_chunks(). Nothing else in the system changes.
-- -----------------------------------------------------------------------------

/**
 * Faculty. Public: the directory is already prerendered for search engines.
 * email is excluded — anon is deliberately denied that column on the source
 * table and the chunk must not become a way around that.
 */
CREATE OR REPLACE FUNCTION public.rebuild_faculty_chunks()
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
      f.id,
      f.name AS title,
      NULLIF(concat_ws(' · ', f.designation, f.department), '') AS subtitle,
      -- Interests repeated after the header so the topical signal is not
      -- drowned out by boilerplate that every row shares.
      concat_ws('. ',
        concat_ws(', ', f.name, f.designation),
        'Department: ' || f.department,
        NULLIF('School: ' || COALESCE(f.school, ''), 'School: '),
        NULLIF('Research interests: ' || array_to_string(f.interests || f.research_areas, ', '), 'Research interests: ')
      ) AS body,
      jsonb_build_object(
        'slug', f.slug,
        'department', f.department,
        'designation', f.designation,
        'image_url', f.image_url,
        'interests', to_jsonb(f.interests),
        'rating_count', f.rating_count,
        'avg_overall', f.avg_overall
      ) AS metadata,
      '/faculty/' || f.slug AS source_path
    FROM public.faculty f
    WHERE f.is_active
  )
  INSERT INTO public.knowledge_chunks
    (entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'faculty', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path,
         md5(s.body)
  FROM source s
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title       = EXCLUDED.title,
    subtitle    = EXCLUDED.subtitle,
    body        = EXCLUDED.body,
    metadata    = EXCLUDED.metadata,
    visibility  = EXCLUDED.visibility,
    source_path = EXCLUDED.source_path,
    content_hash = EXCLUDED.content_hash,
    -- Only throw away the embedding when the text actually changed. A sync that
    -- rewrites identical rows must not trigger 600 needless API calls.
    embedding   = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                       THEN NULL ELSE public.knowledge_chunks.embedding END,
    embedded_at = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                       THEN NULL ELSE public.knowledge_chunks.embedded_at END;

  GET DIAGNOSTICS affected = ROW_COUNT;

  -- Retired faculty stop being searchable. Their ratings survive on the source
  -- table; only the index entry goes.
  DELETE FROM public.knowledge_chunks kc
  WHERE kc.entity_type = 'faculty'
    AND NOT EXISTS (SELECT 1 FROM public.faculty f WHERE f.id = kc.entity_id AND f.is_active);

  RETURN affected;
END;
$$;

/**
 * Mentors. The WHERE clause mirrors getMentors() in the client, so search can
 * never return a mentor the /mentors page will not show — a result that leads
 * to a missing profile is worse than no result.
 *
 * mobile and cgpa are excluded on purpose: one is contact PII, the other is
 * something a student shared to be verified, not to be indexed.
 */
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
      concat_ws('. ',
        concat_ws(', ', m.name, m.year_of_studies || ' student', m.department),
        NULLIF('Skills: ' || array_to_string(m.skills, ', '), 'Skills: '),
        NULLIF(m.bio, ''),
        NULLIF('Interests: ' || COALESCE(m.hobbies, ''), 'Interests: '),
        CASE WHEN m.is_alumni THEN concat_ws(' ', 'Alumni', NULLIF('now ' || m.job_title, 'now '), NULLIF('at ' || m.company, 'at ')) END
      ) AS body,
      jsonb_build_object(
        'department', m.department,
        'skills', to_jsonb(COALESCE(m.skills, ARRAY[]::text[])),
        'profile_image', m.profile_image,
        'year_of_studies', m.year_of_studies,
        'is_alumni', COALESCE(m.is_alumni, false),
        'rating', m.rating,
        'review_count', m.review_count
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
    title       = EXCLUDED.title,
    subtitle    = EXCLUDED.subtitle,
    body        = EXCLUDED.body,
    metadata    = EXCLUDED.metadata,
    visibility  = EXCLUDED.visibility,
    source_path = EXCLUDED.source_path,
    content_hash = EXCLUDED.content_hash,
    embedding   = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                       THEN NULL ELSE public.knowledge_chunks.embedding END,
    embedded_at = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                       THEN NULL ELSE public.knowledge_chunks.embedded_at END;

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

/** Every projector, in one call. This is what the schedule runs. */
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
-- Search
--
-- Returns faculty and mentors from one query, ranked by topical fit. That is
-- the feature: no course catalogue or group chat can answer "who can help with
-- X" across both halves of the campus at once.
--
-- Ranking is by similarity ONLY. Ratings travel in metadata for display and
-- must never order the list — these are named real people on a publicly
-- indexable page, and "worst-rated professor" is not a list this project builds.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_knowledge(
  p_embedding     extensions.vector(768),
  p_entity_types  TEXT[] DEFAULT ARRAY['faculty', 'mentor'],
  p_limit         INTEGER DEFAULT 10,
  p_viewer        UUID DEFAULT NULL,
  p_min_similarity REAL DEFAULT 0.30
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
    -- Visibility is filtered here, in SQL, before a single row reaches the
    -- caller or any model. Anonymous callers see public rows only.
    AND (
      kc.visibility = 'public'
      OR (kc.visibility = 'signed_in' AND p_viewer IS NOT NULL)
    )
    AND (1 - (kc.embedding <=> p_embedding)) >= p_min_similarity
  ORDER BY kc.embedding <=> p_embedding
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
$$;

-- -----------------------------------------------------------------------------
-- Grants
--
-- Projectors and the rebuild are operational, not an API: service_role only.
-- search_knowledge is called by the semantic-search edge function with the
-- service key, never from the browser (the browser cannot embed a query), so it
-- does not need anon either.
--
-- REVOKE FROM PUBLIC alone is insufficient — Supabase default privileges grant
-- EXECUTE to anon and authenticated separately. Same rule as
-- 20260804170000_lock_down_anon_rpc_surface.sql.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.rebuild_faculty_chunks()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rebuild_mentor_chunks()    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rebuild_knowledge_chunks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_knowledge(extensions.vector, TEXT[], INTEGER, UUID, REAL)
  FROM PUBLIC, anon, authenticated;
