-- =============================================================================
-- A keyword leg for the knowledge index
--
-- Until now every document, notice and article on /search could only be found
-- one way: by cosine distance against a 768-dimension embedding. Faculty,
-- mentors, opportunities, posts and groups each also have a lexical SQL query
-- behind them in useSearchResults; documents never did. So the literal word
-- "midterm", sitting in the academic calendar, had exactly one route to the
-- reader -- and when a long query pulled the embedding toward the faculty
-- cluster, there was no second route and the answer simply vanished.
--
-- Embeddings are good at "contest" matching "hackathon" and bad at exact
-- tokens. "hall ticket", "re-registration", "CGPA", a reference number, a
-- course code -- these are precisely what students type and precisely what a
-- vector blurs. The two retrieval methods fail on opposite inputs, which is
-- what makes fusing them worth the extra query rather than tuning either one
-- further.
--
-- COLUMN GRANTS: checked, and deliberately not needed here. Adding a column to
-- a table that grants column-level SELECT silently 401s the whole table for
-- that role (this blanked the public faculty directory on 2026-08-06). This
-- table is not one of those: 20260806160000 does REVOKE ALL ON
-- public.knowledge_chunks FROM anon and gates the rest behind RLS with an
-- admin-only policy, so there are no column grants to fall out of date. Every
-- read still goes through a SECURITY DEFINER function.
--
--   SELECT grantee, count(*) FROM information_schema.column_privileges
--   WHERE table_schema='public' AND table_name='knowledge_chunks'
--     AND privilege_type='SELECT' GROUP BY grantee;
--
-- REWRITE: adding a STORED generated column rewrites the table. knowledge_chunks
-- is thousands of rows, not millions, so this is seconds, but it does take an
-- ACCESS EXCLUSIVE lock -- run it when search traffic is low.
-- =============================================================================

-- Weighted so a hit in the title outranks a hit buried in body text. The
-- two-argument form of to_tsvector is required: the one-argument form depends
-- on default_text_search_config and is only STABLE, which a generated column
-- rejects.
ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(subtitle, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS knowledge_chunks_search_vector_idx
  ON public.knowledge_chunks USING GIN (search_vector);

-- =============================================================================
-- keyword_search_knowledge()
--
-- Deliberately NOT merged into search_knowledge(). Keeping the two legs as
-- separate functions means this one carries no vector type and no `<=>`
-- operator, so it runs under PGlite and is covered by npm run test:migrations
-- like any ordinary SQL -- every previous change to search_knowledge() had to
-- be added to that file's SKIP list and verified by hand against production.
-- Fusion happens in the semantic-search edge function, where the Reciprocal
-- Rank Fusion for the multi-phrasing legs already lives.
--
-- Same visibility rule as search_knowledge(), same shape of row, so a caller
-- can fuse the two lists without special-casing either.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.keyword_search_knowledge(
  p_query        TEXT,
  p_entity_types TEXT[]  DEFAULT ARRAY['faculty', 'mentor', 'student', 'opportunity', 'community', 'post', 'document', 'notice', 'article'],
  p_limit        INTEGER DEFAULT 10,
  p_viewer       UUID    DEFAULT NULL,
  p_min_rank     REAL    DEFAULT 0.02
)
RETURNS TABLE (
  entity_type  TEXT,
  entity_id    UUID,
  title        TEXT,
  subtitle     TEXT,
  body         TEXT,
  metadata     JSONB,
  source_path  TEXT,
  keyword_rank REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_query tsquery;
BEGIN
  -- Terms are OR-ed, not AND-ed.
  --
  -- websearch_to_tsquery ANDs by default, and AND is the wrong operator for a
  -- question: "when are midterms for btech cse 7th sem starting" reduces to
  -- terms the academic calendar does not all contain, so requiring every one
  -- of them returns nothing at all -- the same empty result this leg exists to
  -- prevent. OR-ing gives recall, and ts_rank_cd still puts the chunk matching
  -- several terms above the chunk matching one.
  --
  -- Punctuation is stripped first, which also strips the operators
  -- websearch_to_tsquery would otherwise honour (quotes, leading '-'). That is
  -- intentional: this leg is for recall on plain words, the vector leg handles
  -- nuance, and a stripped input cannot produce a syntax error on text a
  -- student typed.
  v_query := websearch_to_tsquery(
    'english',
    array_to_string(
      array_remove(
        regexp_split_to_array(regexp_replace(lower(coalesce(p_query, '')), '[^a-z0-9 ]', ' ', 'g'), '\s+'),
        ''
      ),
      ' or '
    )
  );

  IF v_query IS NULL OR v_query::text = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    kc.entity_type,
    kc.entity_id,
    kc.title,
    kc.subtitle,
    kc.body,
    kc.metadata,
    kc.source_path,
    -- Normalisation flag 32 divides by (rank + 1), bounding the result to
    -- 0-1 while preserving order. Callers combine this with a cosine
    -- similarity on the same 0-1 scale, and an unbounded rank would silently
    -- dominate that combination.
    ts_rank_cd(kc.search_vector, v_query, 32)::REAL AS keyword_rank
  FROM public.knowledge_chunks kc
  WHERE kc.search_vector @@ v_query
    AND kc.entity_type = ANY(p_entity_types)
    AND (
      kc.visibility = 'public'
      OR (kc.visibility = 'signed_in' AND p_viewer IS NOT NULL)
    )
    AND ts_rank_cd(kc.search_vector, v_query, 32) >= COALESCE(p_min_rank, 0.02)
  ORDER BY ts_rank_cd(kc.search_vector, v_query, 32) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
END;
$$;

-- Not an API. Retrieval reaches this through the service role in the
-- semantic-search edge function, exactly as it reaches search_knowledge().
-- REVOKE FROM PUBLIC alone is insufficient -- Supabase's default privileges
-- grant EXECUTE to anon and authenticated separately.
REVOKE ALL ON FUNCTION public.keyword_search_knowledge(TEXT, TEXT[], INTEGER, UUID, REAL)
  FROM PUBLIC, anon, authenticated;
