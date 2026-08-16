-- Migration: 20260817100000_dynamic_related_searches.sql
-- Description: Phase 5 - Data-driven related searches via RPC

CREATE OR REPLACE FUNCTION public.get_related_searches(
  p_query text,
  p_limit int DEFAULT 6
)
RETURNS TABLE (
  query_text text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_query_hash text;
  v_embedding vector(768);
BEGIN
  -- 1. Normalize and hash the incoming query
  v_query_hash := md5(regexp_replace(lower(trim(p_query)), '\s+', ' ', 'g'));
  
  -- 2. Attempt to retrieve the embedding for this query from the cache
  -- Since embedding is typically vector(768) in production but might be interacted
  -- with as JSON by the edge function, we cast safely.
  BEGIN
    SELECT (embedding::text)::vector INTO v_embedding 
    FROM public.search_query_cache 
    WHERE query_hash = v_query_hash;
  EXCEPTION WHEN others THEN
    BEGIN
      SELECT embedding INTO v_embedding 
      FROM public.search_query_cache 
      WHERE query_hash = v_query_hash;
    EXCEPTION WHEN others THEN
      v_embedding := NULL;
    END;
  END;

  -- 3. If no embedding is found (e.g. brand new query that hasn't hit semantic-search yet),
  -- fallback to returning globally popular queries.
  IF v_embedding IS NULL THEN
    RETURN QUERY
    SELECT sqc.query_text
    FROM public.search_query_cache sqc
    WHERE sqc.query_hash != v_query_hash
      AND sqc.hit_count > 1
      AND length(sqc.query_text) > 3
      AND length(sqc.query_text) < 50
    ORDER BY sqc.hit_count DESC, sqc.last_used_at DESC
    LIMIT p_limit;
    
    RETURN;
  END IF;

  -- 4. Vector similarity search against other cached queries
  RETURN QUERY
  SELECT sqc.query_text
  FROM public.search_query_cache sqc
  WHERE sqc.query_hash != v_query_hash
    AND sqc.embedding IS NOT NULL
    AND sqc.hit_count > 1
    AND length(sqc.query_text) > 3
    AND length(sqc.query_text) < 50
    -- Cosine distance < 0.25 (i.e. > 0.75 similarity)
    AND (sqc.embedding::text)::vector <=> v_embedding < 0.25
  ORDER BY 
    (sqc.embedding::text)::vector <=> v_embedding ASC,
    sqc.hit_count DESC
  LIMIT p_limit;
END;
$$;

-- Grant access so the client can call this function anonymously or authenticated
GRANT EXECUTE ON FUNCTION public.get_related_searches(text, int) TO anon, authenticated;
