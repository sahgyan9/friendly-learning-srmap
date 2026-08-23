-- =============================================================================
-- search_knowledge() never returned chunk body text
--
-- RETURNS TABLE only ever exposed title/subtitle/metadata/source_path/
-- similarity. Every caller that reads a result row's `body` -- ai-chatbot's
-- Retrieved.body (used to build REFERENCE_BODY_CHARS excerpts) and
-- generate-ai-overview's `m.body.slice(0, 1500)` excerpt fed into the LLM
-- prompt -- has therefore always received `undefined`, silently. Both the
-- citation prose and the AI Overview model's judgment of what to cite have
-- been working from titles/subtitles alone, never the actual passage text.
-- That is a real contributor to citing loosely-titled documents (e.g. "Code
-- of Conduct") for queries the body text would have made obviously
-- irrelevant -- the model could not see enough to tell.
--
-- Same signature (extensions.vector, TEXT[], INTEGER, UUID, REAL), same
-- callers, same grants -- adds one output column. CREATE OR REPLACE cannot
-- change an existing function's return columns, so this drops first.
-- =============================================================================

DROP FUNCTION IF EXISTS public.search_knowledge(extensions.vector, TEXT[], INTEGER, UUID, REAL);

CREATE FUNCTION public.search_knowledge(
  p_embedding      extensions.vector(768),
  p_entity_types   TEXT[]  DEFAULT ARRAY['faculty', 'mentor', 'opportunity', 'community', 'post'],
  p_limit          INTEGER DEFAULT 10,
  p_viewer         UUID    DEFAULT NULL,
  p_min_similarity REAL    DEFAULT 0.35
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id   UUID,
  title       TEXT,
  subtitle    TEXT,
  body        TEXT,
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
    kc.body,
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

-- Grants stay the same -- no new public surface exposed.
REVOKE ALL ON FUNCTION public.search_knowledge(extensions.vector, TEXT[], INTEGER, UUID, REAL)
  FROM PUBLIC, anon, authenticated;
