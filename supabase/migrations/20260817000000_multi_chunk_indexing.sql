
-- =============================================================================
-- Phase 4: Multi-Chunk Indexing
-- 
-- Modifies knowledge_chunks to support multiple chunks per entity (via chunk_index).
-- Redefines all projector functions to conform to the new UNIQUE constraint.
-- Faculty and Mentors are split into multiple chunks (main + interests/skills).
-- =============================================================================

ALTER TABLE public.knowledge_chunks ADD COLUMN chunk_index TEXT NOT NULL DEFAULT 'main';

DO $$ 
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.knowledge_chunks'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 2;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.knowledge_chunks DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;

ALTER TABLE public.knowledge_chunks ADD CONSTRAINT knowledge_chunks_entity_type_entity_id_chunk_index_key UNIQUE (entity_type, entity_id, chunk_index);

-- From supabase/migrations/20260806190000_opportunities.sql
CREATE OR REPLACE FUNCTION public.rebuild_opportunity_chunks()
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
      o.id,
      o.title,
      NULLIF(concat_ws(' · ', o.organiser, o.location), '') AS subtitle,
      concat_ws('. ',
        concat_ws(', ', o.title, o.kind, o.organiser),
        NULLIF(o.description, ''),
        NULLIF('Topics: ' || array_to_string(o.tags, ', '), 'Topics: '),
        CASE WHEN o.is_online THEN 'Online' ELSE NULLIF(o.location, '') END
      ) AS body,
      jsonb_build_object(
        'slug', o.slug,
        'kind', o.kind,
        'organiser', o.organiser,
        'tags', to_jsonb(o.tags),
        'register_by', o.register_by,
        'is_online', o.is_online,
        'interest_count', o.interest_count,
        'team_count', o.team_count
      ) AS metadata,
      '/opportunities/' || o.slug AS source_path
    FROM public.opportunities o
    WHERE o.is_published
      AND (o.register_by IS NULL OR o.register_by > now())
  )
  INSERT INTO public.knowledge_chunks
    (chunk_index, entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'main', 'opportunity', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path, md5(s.body)
  FROM source s
  ON CONFLICT (entity_type, entity_id, chunk_index) DO UPDATE SET
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

  -- Closed, unpublished and expired opportunities drop out of search. The row
  -- itself survives so the page and its teams stay reachable by link.
  DELETE FROM public.knowledge_chunks kc
  WHERE kc.entity_type = 'opportunity'
    AND kc.chunk_index = 'main'
    AND NOT EXISTS (
      SELECT 1 FROM public.opportunities o
      WHERE o.id = kc.entity_id
        AND o.is_published
        AND (o.register_by IS NULL OR o.register_by > now())
    );

  RETURN affected;
END;
$$;

-- From supabase/migrations/20260807030000_search_groups_and_posts.sql
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
    (chunk_index, entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'main', 'community', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path, md5(s.body)
  FROM source s
  ON CONFLICT (entity_type, entity_id, chunk_index) DO UPDATE SET
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
    AND kc.chunk_index = 'main'
    AND (p_id IS NULL OR kc.entity_id = p_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = kc.entity_id AND NOT c.is_archived
    );

  RETURN affected;
END;
$$;

-- From supabase/migrations/20260807030000_search_groups_and_posts.sql
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
    (chunk_index, entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'main', 'post', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path, md5(s.body)
  FROM source s
  ON CONFLICT (entity_type, entity_id, chunk_index) DO UPDATE SET
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
    AND kc.chunk_index = 'main'
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

-- From supabase/migrations/20260809120000_student_interest_chunks.sql
CREATE OR REPLACE FUNCTION public.rebuild_student_chunks(p_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE affected INTEGER;
BEGIN
  WITH source AS (
    SELECT u.id,
      u.name AS title,
      NULLIF(concat_ws(' · ', u.department,
        CASE WHEN u.graduation_year IS NOT NULL THEN 'Class of ' || u.graduation_year END), '') AS subtitle,
      concat_ws('. ',
        concat_ws(', ', u.name, u.department),
        NULLIF('Interested in: ' || array_to_string(u.interests, ', '), 'Interested in: '),
        NULLIF('Skills: ' || array_to_string(COALESCE(u.skills, ARRAY[]::text[]), ', '), 'Skills: '),
        NULLIF(u.bio, '')
      ) AS body,
      jsonb_build_object(
        'department', u.department,
        'interests', to_jsonb(u.interests),
        'profile_image', u.profile_image,
        'graduation_year', u.graduation_year
      ) AS metadata
    FROM public.users u
    WHERE u.interests_discoverable
      AND cardinality(u.interests) > 0
      AND (p_user_id IS NULL OR u.id = p_user_id)
      AND NOT EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = u.id)
  )
  INSERT INTO public.knowledge_chunks
    (chunk_index, entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'main', 'student', s.id, s.title, s.subtitle, s.body, s.metadata, 'signed_in', NULL, md5(s.body)
  FROM source s
  ON CONFLICT (entity_type, entity_id, chunk_index) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    body = EXCLUDED.body,
    metadata = EXCLUDED.metadata,
    visibility = EXCLUDED.visibility,
    source_path = EXCLUDED.source_path,
    content_hash = EXCLUDED.content_hash,
    embedding = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                     THEN NULL ELSE public.knowledge_chunks.embedding END,
    embedded_at = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                       THEN NULL ELSE public.knowledge_chunks.embedded_at END;

  GET DIAGNOSTICS affected = ROW_COUNT;

  DELETE FROM public.knowledge_chunks kc
  WHERE kc.entity_type = 'student'
    AND kc.chunk_index = 'main'
    AND (p_user_id IS NULL OR kc.entity_id = p_user_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = kc.entity_id
        AND u.interests_discoverable
        AND cardinality(u.interests) > 0
        AND NOT EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = u.id)
    );

  RETURN affected;
END; $fn$;


-- -----------------------------------------------------------------------------
-- Faculty projector (Multi-Chunk)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_faculty_chunks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  affected INTEGER;
BEGIN
  WITH source_main AS (
    SELECT
      f.id,
      'main' AS chunk_index,
      f.name AS title,
      NULLIF(concat_ws(' · ', f.designation, f.department), '') AS subtitle,
      concat_ws('. ',
        concat_ws(', ', f.name, f.designation),
        'Department: ' || f.department,
        NULLIF('School: ' || COALESCE(f.school, ''), 'School: ')
      ) AS body,
      jsonb_build_object(
        'slug', f.slug,
        'department', f.department,
        'designation', f.designation,
        'image_url', f.image_url,
        'rating_count', f.rating_count,
        'avg_overall', f.avg_overall
      ) AS metadata,
      '/faculty/' || f.slug AS source_path
    FROM public.faculty f
    WHERE f.is_active
  ),
  source_interests AS (
    SELECT
      f.id,
      'interest_' || row_number() over(partition by f.id) AS chunk_index,
      f.name AS title,
      NULLIF(concat_ws(' · ', f.designation, f.department), '') AS subtitle,
      'Research interest: ' || interest AS body,
      jsonb_build_object(
        'slug', f.slug,
        'department', f.department,
        'designation', f.designation,
        'image_url', f.image_url,
        'interests', to_jsonb(ARRAY[interest]),
        'rating_count', f.rating_count,
        'avg_overall', f.avg_overall
      ) AS metadata,
      '/faculty/' || f.slug AS source_path
    FROM public.faculty f,
         unnest(f.interests || COALESCE(f.research_areas, ARRAY[]::text[])) AS interest
    WHERE f.is_active AND interest IS NOT NULL AND trim(interest) != ''
  ),
  source_all AS (
    SELECT * FROM source_main
    UNION ALL
    SELECT * FROM source_interests
  )
  INSERT INTO public.knowledge_chunks
    (chunk_index, entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT s.chunk_index, 'faculty', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path, md5(s.body)
  FROM source_all s
  ON CONFLICT (entity_type, entity_id, chunk_index) DO UPDATE SET
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
  WHERE kc.entity_type = 'faculty'
    AND NOT EXISTS (
      SELECT 1 FROM source_all s 
      WHERE s.id = kc.entity_id AND s.chunk_index = kc.chunk_index
    );

  RETURN affected;
END;
$$;

-- -----------------------------------------------------------------------------
-- Mentor projector (Multi-Chunk)
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
  WITH source_main AS (
    SELECT
      m.id,
      'main' AS chunk_index,
      m.name AS title,
      NULLIF(concat_ws(' · ', m.year_of_studies, m.department), '') AS subtitle,
      concat_ws('. ',
        m.name || ', ' || COALESCE(m.year_of_studies, '') || ' student' || CASE WHEN m.department IS NOT NULL THEN ' in ' || m.department ELSE '' END || '.',
        NULLIF(trim(m.bio), ''),
        CASE
          WHEN COALESCE(trim(m.hobbies), '') <> ''
          THEN 'Interests include ' || m.hobbies || '.'
        END,
        CASE
          WHEN m.is_alumni IS TRUE
          THEN 'Alumni' || NULLIF(' now ' || m.job_title, ' now ') || NULLIF(' at ' || m.company, ' at ') || '.'
        END
      ) AS body,
      jsonb_build_object(
        'department',      m.department,
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
  ),
  source_skills AS (
    SELECT
      m.id,
      'skill_' || row_number() over(partition by m.id) AS chunk_index,
      m.name AS title,
      NULLIF(concat_ws(' · ', m.year_of_studies, m.department), '') AS subtitle,
      'Proficient in ' || skill || '. Can help with ' || skill || '.' AS body,
      jsonb_build_object(
        'department',      m.department,
        'skills',          to_jsonb(ARRAY[skill]),
        'profile_image',   m.profile_image,
        'year_of_studies', m.year_of_studies,
        'is_alumni',       COALESCE(m.is_alumni, false),
        'rating',          m.rating,
        'review_count',    m.review_count,
        'bio',             NULLIF(trim(m.bio), '')
      ) AS metadata,
      '/mentor/' || m.id AS source_path
    FROM public.mentors m,
         unnest(m.skills) AS skill
    WHERE m.department IS NOT NULL AND m.department <> 'General' AND skill IS NOT NULL AND trim(skill) != ''
  ),
  source_all AS (
    SELECT * FROM source_main
    UNION ALL
    SELECT * FROM source_skills
  )
  INSERT INTO public.knowledge_chunks
    (chunk_index, entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT s.chunk_index, 'mentor', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path, md5(s.body)
  FROM source_all s
  ON CONFLICT (entity_type, entity_id, chunk_index) DO UPDATE SET
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
  WHERE kc.entity_type = 'mentor'
    AND NOT EXISTS (
      SELECT 1 FROM source_all s
      WHERE s.id = kc.entity_id AND s.chunk_index = kc.chunk_index
    );

  RETURN affected;
END;
$$;

-- -----------------------------------------------------------------------------
-- Ensure permissions are reset
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.rebuild_opportunity_chunks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rebuild_community_chunks(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rebuild_post_chunks(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rebuild_student_chunks(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rebuild_faculty_chunks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rebuild_mentor_chunks() FROM PUBLIC, anon, authenticated;
