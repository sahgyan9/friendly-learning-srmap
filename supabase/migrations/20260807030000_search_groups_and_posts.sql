-- =============================================================================
-- Groups and posts join the search index
--
-- The index held faculty, mentors and opportunities. Groups and board posts were
-- reachable only by literal spelling, through the ILIKE pass in useSiteSearch —
-- so "where do people work on ML projects together" found a professor and never
-- found the AI/ML study group that exists for exactly that. Half the answers on
-- this campus are a group or a thread, not a person.
--
-- WHAT IS SAFE TO INDEX, AND WHY IT DIFFERS BETWEEN THE TWO.
--
-- A community is listed and searchable *even when private* — that is the
-- deliberate behaviour recorded on Community.visibility in communities.ts, and
-- the RLS agrees: `Anyone can view communities` has qual `true`. A private group
-- nobody can find is a group nobody can ask to join. Only the name, the kind and
-- the description go in; the posts inside never do.
--
-- A post is the opposite. Its RLS is
--   (community_id IS NULL) OR can_view_community(community_id, auth.uid())
-- so a post in a private group is readable by members only. Those are skipped
-- entirely rather than projected as 'members_only': search_knowledge can never
-- return that visibility, so projecting them would embed rows nobody can ever
-- retrieve and spend the embedding quota to do it. Flipping a group public makes
-- its posts appear on the next rebuild; flipping it private deletes them.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Groups
--
-- Takes an optional id so the write trigger below can reproject one row instead
-- of the whole table. NULL means "everything", which is what the hourly rebuild
-- wants. Posts do the same, and there it matters much more — see the note on
-- that trigger.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_community_chunks(p_id UUID DEFAULT NULL)
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
      c.id,
      c.name AS title,
      NULLIF(concat_ws(' · ', initcap(c.kind), c.member_count || ' members'), '') AS subtitle,
      -- The kind is spelled out as a word ("a hackathon team", "a study group")
      -- rather than left as the bare enum value, because the embedding matches
      -- on language and "study" alone carries far less than "study group".
      concat_ws('. ',
        concat_ws(', ', c.name,
          CASE c.kind
            WHEN 'hackathon' THEN 'a hackathon team'
            WHEN 'project'   THEN 'a project team'
            WHEN 'club'      THEN 'a student club'
            WHEN 'study'     THEN 'a study group'
            WHEN 'research'  THEN 'a research group'
            ELSE 'a student group'
          END),
        NULLIF(c.description, '')
      ) AS body,
      jsonb_build_object(
        'slug', c.slug,
        'kind', c.kind,
        'member_count', c.member_count,
        'post_count', c.post_count,
        'visibility', c.visibility,
        'cover_image', c.cover_image
      ) AS metadata,
      '/communities/' || c.slug AS source_path
    FROM public.communities c
    WHERE NOT c.is_archived
      AND (p_id IS NULL OR c.id = p_id)
  )
  INSERT INTO public.knowledge_chunks
    (entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'community', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path, md5(s.body)
  FROM source s
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title        = EXCLUDED.title,
    subtitle     = EXCLUDED.subtitle,
    body         = EXCLUDED.body,
    metadata     = EXCLUDED.metadata,
    visibility   = EXCLUDED.visibility,
    source_path  = EXCLUDED.source_path,
    content_hash = EXCLUDED.content_hash,
    -- Only discard the vector when the text actually moved. member_count is in
    -- metadata and changes every time somebody joins; re-embedding on that would
    -- burn quota for a number that is not in the embedded text at all.
    embedding    = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                        THEN NULL ELSE public.knowledge_chunks.embedding END,
    embedded_at  = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                        THEN NULL ELSE public.knowledge_chunks.embedded_at END;

  GET DIAGNOSTICS affected = ROW_COUNT;

  -- Archived and deleted groups leave the index. Scoped to p_id when given, so
  -- one group's write does not scan every chunk.
  DELETE FROM public.knowledge_chunks kc
  WHERE kc.entity_type = 'community'
    AND (p_id IS NULL OR kc.entity_id = p_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = kc.entity_id AND NOT c.is_archived
    );

  RETURN affected;
END;
$$;

-- -----------------------------------------------------------------------------
-- Board posts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_post_chunks(p_id UUID DEFAULT NULL)
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
      p.id,
      p.title,
      NULLIF(
        concat_ws(' · ',
          COALESCE(c.name, 'Community board'),
          p.comments_count || CASE WHEN p.comments_count = 1 THEN ' reply' ELSE ' replies' END
        ), '') AS subtitle,
      concat_ws('. ',
        p.title,
        NULLIF(left(p.content, 4000), ''),
        NULLIF('Tags: ' || array_to_string(p.tags, ', '), 'Tags: '),
        NULLIF('Posted in ' || c.name, 'Posted in ')
      ) AS body,
      jsonb_build_object(
        'post_type', p.post_type,
        'status', p.status,
        'tags', to_jsonb(COALESCE(p.tags, ARRAY[]::text[])),
        'comments_count', p.comments_count,
        'likes_count', p.likes_count,
        'community_name', c.name,
        'community_slug', c.slug
      ) AS metadata,
      '/community-posts/' || p.id AS source_path
    FROM public.community_posts p
    LEFT JOIN public.communities c ON c.id = p.community_id
    WHERE (p_id IS NULL OR p.id = p_id)
      -- The RLS condition, restated. A post is indexed only when it is on the
      -- open board or inside a group anyone can read. Author identity is left
      -- out on purpose: the post is the answer, and a searchable index of who
      -- asked what is not a thing this project builds.
      AND (p.community_id IS NULL OR (c.id IS NOT NULL AND c.visibility = 'public' AND NOT c.is_archived))
      -- An untitled or empty post has nothing to match on and would only
      -- dilute the index.
      AND btrim(COALESCE(p.title, '')) <> ''
  )
  INSERT INTO public.knowledge_chunks
    (entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'post', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path, md5(s.body)
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
  WHERE kc.entity_type = 'post'
    AND (p_id IS NULL OR kc.entity_id = p_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.community_posts p
      LEFT JOIN public.communities c ON c.id = p.community_id
      WHERE p.id = kc.entity_id
        AND (p.community_id IS NULL OR (c.id IS NOT NULL AND c.visibility = 'public' AND NOT c.is_archived))
        AND btrim(COALESCE(p.title, '')) <> ''
    );

  RETURN affected;
END;
$$;

-- -----------------------------------------------------------------------------
-- Every projector, in one call. This is what the hourly schedule runs.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_knowledge_chunks()
RETURNS TABLE (entity_type TEXT, rows_upserted INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT 'faculty'::TEXT,     public.rebuild_faculty_chunks();
  RETURN QUERY SELECT 'mentor'::TEXT,      public.rebuild_mentor_chunks();
  RETURN QUERY SELECT 'opportunity'::TEXT, public.rebuild_opportunity_chunks();
  RETURN QUERY SELECT 'community'::TEXT,   public.rebuild_community_chunks();
  RETURN QUERY SELECT 'post'::TEXT,        public.rebuild_post_chunks();
END;
$$;

-- -----------------------------------------------------------------------------
-- Project on write
--
-- Per row, not per statement — the opposite of the opportunities trigger, and
-- deliberately. rebuild_opportunity_chunks() rebuilds its whole (tiny, curated)
-- table on every write, which is fine for a few dozen listings. Posts are the
-- highest-volume table here and grow without a ceiling, so a full rebuild per
-- insert would turn every new post into a scan of every post. Passing the id
-- keeps the work proportional to what actually changed.
--
-- The chunk lands immediately; its vector follows within ten minutes, when
-- embed-knowledge-topup next runs. Until then the post is findable by keyword
-- through the literal pass, just not yet by meaning.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.community_posts_reproject()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.knowledge_chunks
    WHERE entity_type = 'post' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;

  PERFORM public.rebuild_post_chunks(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_posts_reproject ON public.community_posts;
CREATE TRIGGER trg_community_posts_reproject
  AFTER INSERT OR UPDATE OR DELETE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_posts_reproject();

/**
 * Groups. A visibility change has to cascade: making a group private must pull
 * its posts out of the index in the same statement, not an hour later. That is
 * the one case where the group trigger cannot stay scoped to the group row.
 */
CREATE OR REPLACE FUNCTION public.communities_reproject()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.knowledge_chunks
    WHERE entity_type = 'community' AND entity_id = OLD.id;
    -- ON DELETE of the group, its posts go too (or are orphaned to the open
    -- board, depending on the FK). Either way the safe move is to reproject
    -- them rather than guess.
    PERFORM public.rebuild_post_chunks();
    RETURN OLD;
  END IF;

  PERFORM public.rebuild_community_chunks(NEW.id);

  IF TG_OP = 'UPDATE'
     AND (NEW.visibility IS DISTINCT FROM OLD.visibility
          OR NEW.is_archived IS DISTINCT FROM OLD.is_archived
          OR NEW.name IS DISTINCT FROM OLD.name) THEN
    PERFORM public.rebuild_post_chunks();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_communities_reproject ON public.communities;
CREATE TRIGGER trg_communities_reproject
  AFTER INSERT OR UPDATE OR DELETE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.communities_reproject();

-- -----------------------------------------------------------------------------
-- Let the default cover the new types
--
-- The edge function passes p_entity_types explicitly, so this default is only
-- the answer for a caller that does not. It said faculty+mentor, which quietly
-- excluded opportunities as well. Same signature, so this is a replace, not a
-- new overload.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_knowledge(
  p_embedding     extensions.vector(768),
  p_entity_types  TEXT[] DEFAULT ARRAY['faculty', 'mentor', 'opportunity', 'community', 'post'],
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
-- Projectors and triggers are operational, not an API. New functions are exposed
-- to anon and authenticated by default on this project, and revoking from PUBLIC
-- alone does not undo Supabase's separate default grants.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.rebuild_community_chunks(UUID)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rebuild_post_chunks(UUID)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_posts_reproject()     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.communities_reproject()         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rebuild_knowledge_chunks()      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_knowledge(extensions.vector, TEXT[], INTEGER, UUID, REAL)
  FROM PUBLIC, anon, authenticated;

-- Backfill. The triggers only fire on future writes; the groups and posts that
-- already exist need one explicit pass. embed-knowledge-topup picks the vectors
-- up on its next ten-minute run.
SELECT public.rebuild_community_chunks();
SELECT public.rebuild_post_chunks();
