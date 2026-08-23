-- =============================================================================
-- search_knowledge() recommended mentors who had paused their listing
--
-- A mentor pausing themselves is honoured in exactly one place: the directory
-- query, via listedOnly()/isMentorListed() in the frontend service. Everything
-- that reaches students through knowledge_chunks ignored it -- so a mentor who
-- paused for exams still surfaced in AI mode, in semantic search, and as an AI
-- Overview citation, each with a live "Connect with Mentor" path.
--
-- That breaks the promise in both directions at once. The student messages
-- someone who has explicitly said they are not taking requests and hears
-- nothing back, which reads as the mentor ignoring them. The mentor gets
-- exactly the interruption they opted out of, from a setting that told them
-- they were hidden.
--
-- Fixing it here rather than in the edge functions covers all three callers
-- (semantic-search, ai-chatbot, generate-ai-overview) with one rule. Filtering
-- in each function would be three copies of a rule that already has a canonical
-- definition, and the next caller would silently start leaking again.
--
-- The alternative -- deleting a paused mentor's chunks -- was rejected: their
-- embeddings would have to be regenerated on resume, at Gemini quota cost, to
-- undo something the mentor may reverse the next morning.
--
-- Same signature, same grants, one added WHERE clause.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.search_knowledge(
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
    -- Paused mentors drop out. NOT EXISTS rather than a join so that a mentor
    -- chunk whose row has since been deleted still disappears, and so no other
    -- entity_type is affected by the subquery at all.
    AND (
      kc.entity_type <> 'mentor'
      OR EXISTS (
        SELECT 1 FROM public.mentors m
         WHERE m.id = kc.entity_id
           AND public.mentor_is_listed(m.is_available, m.available_from)
      )
    )
  ORDER BY kc.embedding <=> p_embedding
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
$$;

-- Unchanged, but restated because CREATE OR REPLACE on a SECURITY DEFINER
-- function is exactly where an accidental default grant would go unnoticed.
REVOKE ALL ON FUNCTION public.search_knowledge(extensions.vector, TEXT[], INTEGER, UUID, REAL)
  FROM PUBLIC, anon, authenticated;
