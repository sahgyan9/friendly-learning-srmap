-- =============================================================================
-- Well-being safety layer for Friendly Learning SRMAP
--
-- 1. Anonymous posts & comments:
--    - Adds is_anonymous to community_posts and post_comments.
--    - Closes leaks at database level:
--      * Direct SELECT on community_posts table denies non-authors for anonymous rows.
--      * RPCs get_community_feed, get_community_post, get_post_comments mask author
--        details (author_id null, author_name 'Anonymous student', author_image null,
--        author_department null, author_role null, author_is_mentor false) when
--        is_anonymous is true and auth.uid() <> author_id.
--      * Drops community_posts and post_comments from supabase_realtime publication
--        so raw row payloads are never broadcast.
--      * Search projector (rebuild_post_chunks) maintains author omission and adds
--        is_anonymous flag in metadata.
--
-- 2. Distress flagging (deterministic, non-blocking):
--    - Curated distress_keywords table (English + Hindi/Telugu transliterations).
--    - Triggers on community_posts and post_comments that detect crisis language,
--      set distress_flagged = true, and insert a row into moderation_queue.
--    - Post insertion/update is NEVER blocked or delayed.
--
-- 3. Moderation queue & audit log:
--    - moderation_queue table with source ('keyword' | 'peer_report') and status.
--    - Unmasking author is an explicit admin action recorded in admin_audit_log
--      with admin ID, timestamp, and mandatory justification reason.
--    - report_peer_concern RPC for "I'm worried about this person" peer reports.
--
-- 4. Well-being platform settings:
--    - wellbeing_counsellors, wellbeing_admin_phone, wellbeing_admin_label created
--      with NULL values only (no PII in public code).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columns & Table Grants
-- -----------------------------------------------------------------------------

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS distress_flagged BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS distress_flagged BOOLEAN NOT NULL DEFAULT false;

-- Explicitly grant SELECT on new columns
GRANT SELECT (is_anonymous, distress_flagged) ON public.community_posts TO anon, authenticated;
GRANT SELECT (is_anonymous, distress_flagged) ON public.post_comments TO anon, authenticated;

-- RLS: Direct SELECT on community_posts denies anonymous rows to non-authors.
-- Feeds and post detail read through the SECURITY DEFINER RPCs below, which return
-- the masked record. A stranger or DevTools query directly to PostgREST REST
-- endpoint /rest/v1/community_posts will never receive an anonymous row.
DROP POLICY IF EXISTS "Anyone can view community posts" ON public.community_posts;
CREATE POLICY "Anyone can view community posts"
  ON public.community_posts FOR SELECT
  USING (
    (community_id IS NULL OR public.can_view_community(community_id, auth.uid()))
    AND (NOT is_anonymous OR author_id = auth.uid())
  );

-- Direct SELECT on post_comments denies anonymous rows to non-authors.
DROP POLICY IF EXISTS "Anyone can view comments" ON public.post_comments;
CREATE POLICY "Anyone can view comments"
  ON public.post_comments FOR SELECT
  USING (
    public.can_view_post(post_id, auth.uid())
    AND (NOT is_anonymous OR user_id = auth.uid())
  );

-- Realtime: stop broadcasting raw row payloads carrying author_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'community_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.community_posts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'post_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.post_comments;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Masked RPCs
-- -----------------------------------------------------------------------------

-- Drop previous overloads
DROP FUNCTION IF EXISTS public.get_community_feed(text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_community_feed(text, text, integer, integer, uuid);
DROP FUNCTION IF EXISTS public.get_community_feed(text, text, integer, integer, uuid, boolean);

CREATE OR REPLACE FUNCTION public.get_community_feed(
  p_post_type text default null,
  p_search text default null,
  p_limit integer default 20,
  p_offset integer default 0,
  p_community_id uuid default null,
  p_mine boolean default false
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  post_type text,
  status text,
  tags text[],
  image_url text,
  likes_count integer,
  comments_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  author_id uuid,
  author_name text,
  author_image text,
  author_department text,
  author_role text,
  author_is_mentor boolean,
  viewer_has_liked boolean,
  viewer_is_author boolean,
  community_id uuid,
  community_name text,
  community_slug text,
  total_count bigint,
  is_anonymous boolean,
  viewer_post_flagged boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  with filtered as (
    select p.*
      from public.community_posts p
     where (
             (p_community_id is null and p.community_id is null)
             or (p_community_id is not null and p.community_id = p_community_id)
           )
       and (p.community_id is null or public.can_view_community(p.community_id, auth.uid()))
       and (p_post_type is null or p_post_type = 'all' or p.post_type = p_post_type)
       and (not coalesce(p_mine, false) or (auth.uid() is not null and p.author_id = auth.uid()))
       and (
         p_search is null or btrim(p_search) = ''
         or p.title ilike '%' || p_search || '%'
         or p.content ilike '%' || p_search || '%'
         or exists (select 1 from unnest(p.tags) t where t ilike '%' || p_search || '%')
       )
  )
  select f.id, f.title, f.content, f.post_type, f.status, f.tags, f.image_url,
         f.likes_count, f.comments_count, f.created_at, f.updated_at,
         case when f.is_anonymous and f.author_id is distinct from auth.uid() then null else f.author_id end,
         case when f.is_anonymous and f.author_id is distinct from auth.uid() then 'Anonymous student' else u.name end,
         case when f.is_anonymous and f.author_id is distinct from auth.uid() then null else u.profile_image end,
         case when f.is_anonymous and f.author_id is distinct from auth.uid() then null else u.department end,
         case when f.is_anonymous and f.author_id is distinct from auth.uid() then null else u.role end,
         case when f.is_anonymous and f.author_id is distinct from auth.uid() then false else exists (select 1 from public.mentors m where m.id = f.author_id and m.department <> 'General') end,
         exists (select 1 from public.post_likes l where l.post_id = f.id and l.user_id = auth.uid()),
         (f.author_id = auth.uid()),
         f.community_id, c.name, c.slug,
         (select count(*) from filtered),
         f.is_anonymous,
         case when f.author_id = auth.uid() then f.distress_flagged else false end
    from filtered f
    left join public.users u on u.id = f.author_id
    left join public.communities c on c.id = f.community_id
   order by f.created_at desc
   limit greatest(least(p_limit, 100), 1)
  offset greatest(p_offset, 0);
$function$;

REVOKE ALL ON FUNCTION public.get_community_feed(text, text, integer, integer, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_feed(text, text, integer, integer, uuid, boolean) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_community_post(uuid);

CREATE OR REPLACE FUNCTION public.get_community_post(p_post_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  post_type text,
  status text,
  tags text[],
  image_url text,
  likes_count integer,
  comments_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  author_id uuid,
  author_name text,
  author_image text,
  author_department text,
  author_role text,
  author_is_mentor boolean,
  viewer_has_liked boolean,
  viewer_is_author boolean,
  community_id uuid,
  community_name text,
  community_slug text,
  is_anonymous boolean,
  viewer_post_flagged boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  select p.id, p.title, p.content, p.post_type, p.status, p.tags, p.image_url,
         p.likes_count, p.comments_count, p.created_at, p.updated_at,
         case when p.is_anonymous and p.author_id is distinct from auth.uid() then null else p.author_id end,
         case when p.is_anonymous and p.author_id is distinct from auth.uid() then 'Anonymous student' else u.name end,
         case when p.is_anonymous and p.author_id is distinct from auth.uid() then null else u.profile_image end,
         case when p.is_anonymous and p.author_id is distinct from auth.uid() then null else u.department end,
         case when p.is_anonymous and p.author_id is distinct from auth.uid() then null else u.role end,
         case when p.is_anonymous and p.author_id is distinct from auth.uid() then false else exists (select 1 from public.mentors m where m.id = p.author_id and m.department <> 'General') end,
         exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         (p.author_id = auth.uid()),
         p.community_id, c.name, c.slug,
         p.is_anonymous,
         case when p.author_id = auth.uid() then p.distress_flagged else false end
    from public.community_posts p
    left join public.users u on u.id = p.author_id
    left join public.communities c on c.id = p.community_id
   where p.id = p_post_id
     and (p.community_id is null or public.can_view_community(p.community_id, auth.uid()));
$$;

REVOKE ALL ON FUNCTION public.get_community_post(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_post(uuid) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_post_comments(uuid);

CREATE OR REPLACE FUNCTION public.get_post_comments(p_post_id uuid)
RETURNS TABLE (
  id uuid,
  content text,
  created_at timestamptz,
  updated_at timestamptz,
  author_id uuid,
  author_name text,
  author_image text,
  viewer_is_author boolean,
  is_anonymous boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  select c.id, c.content, c.created_at, c.updated_at,
         case when c.is_anonymous and c.user_id is distinct from auth.uid() then null else c.user_id end,
         case when c.is_anonymous and c.user_id is distinct from auth.uid() then 'Anonymous student' else u.name end,
         case when c.is_anonymous and c.user_id is distinct from auth.uid() then null else u.profile_image end,
         (c.user_id = auth.uid()),
         c.is_anonymous
    from public.post_comments c
    left join public.users u on u.id = c.user_id
   where c.post_id = p_post_id
     and public.can_view_post(p_post_id, auth.uid())
   order by c.created_at asc;
$$;

REVOKE ALL ON FUNCTION public.get_post_comments(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_comments(uuid) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Search Projector Update
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
        'community_slug', c.slug,
        'is_anonymous', p.is_anonymous
      ) AS metadata,
      '/community-posts/' || p.id AS source_path
    FROM public.community_posts p
    LEFT JOIN public.communities c ON c.id = p.community_id
    WHERE (p_id IS NULL OR p.id = p_id)
      AND (p.community_id IS NULL OR (c.id IS NOT NULL AND c.visibility = 'public' AND NOT c.is_archived))
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

REVOKE ALL ON FUNCTION public.rebuild_post_chunks(UUID) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Distress Keywords & Flagging
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.distress_keywords (
  id SERIAL PRIMARY KEY,
  phrase TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'en',
  severity TEXT NOT NULL DEFAULT 'high',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.distress_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage distress keywords"
  ON public.distress_keywords FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Authenticated users can read distress keywords"
  ON public.distress_keywords FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON public.distress_keywords FROM PUBLIC, anon;
GRANT SELECT ON public.distress_keywords TO authenticated;

-- Seed crisis keywords across English, Hindi transliteration, and Telugu transliteration
INSERT INTO public.distress_keywords (phrase, language, severity)
VALUES
  -- English
  ('suicide', 'en', 'critical'),
  ('kill myself', 'en', 'critical'),
  ('want to die', 'en', 'critical'),
  ('end my life', 'en', 'critical'),
  ('ending my life', 'en', 'critical'),
  ('better off dead', 'en', 'critical'),
  ('give up on life', 'en', 'high'),
  ('no reason to live', 'en', 'critical'),
  ('self harm', 'en', 'high'),
  ('cut myself', 'en', 'high'),
  ('cant take this anymore', 'en', 'high'),
  ('cannot take this anymore', 'en', 'high'),
  ('hate being alive', 'en', 'high'),
  ('nobody would care if i died', 'en', 'critical'),
  -- Hindi / Hinglish transliterations
  ('mar jaana chahta hoon', 'hi', 'critical'),
  ('mar jana chahta hu', 'hi', 'critical'),
  ('marne ka man kar raha hai', 'hi', 'critical'),
  ('jaan de dunga', 'hi', 'critical'),
  ('jeena nahi chahta', 'hi', 'critical'),
  ('atmahathya', 'hi', 'critical'),
  ('atmarpan', 'hi', 'high'),
  ('zindagi se tang aa gaya', 'hi', 'high'),
  -- Telugu transliterations
  ('chavatapothunna', 'te', 'critical'),
  ('chani povali anipistundi', 'te', 'critical'),
  ('chani povalani undi', 'te', 'critical'),
  ('brathakali anipiyatledu', 'te', 'critical'),
  ('bathakalani ledu', 'te', 'critical'),
  ('pranam teesukovali', 'te', 'critical')
ON CONFLICT (phrase) DO NOTHING;

CREATE OR REPLACE FUNCTION public.find_distress_phrase(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT phrase
    FROM public.distress_keywords
   WHERE p_text ILIKE '%' || phrase || '%'
   ORDER BY length(phrase) DESC
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_distress_phrase(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_distress_phrase(TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. Moderation Queue & Peer Reports
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment')),
  content_id UUID NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_revealed BOOLEAN NOT NULL DEFAULT false,
  author_revealed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_revealed_at TIMESTAMPTZ,
  author_reveal_reason TEXT,
  matched_phrase TEXT,
  source TEXT NOT NULL CHECK (source IN ('keyword', 'peer_report')),
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'resolved')),
  admin_notes TEXT,
  action_taken_at TIMESTAMPTZ,
  action_taken_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view moderation queue"
  ON public.moderation_queue FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can update moderation queue"
  ON public.moderation_queue FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Authenticated users can insert peer reports"
  ON public.moderation_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by AND source = 'peer_report');

REVOKE ALL ON public.moderation_queue FROM PUBLIC, anon;
GRANT SELECT, UPDATE, INSERT ON public.moderation_queue TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. Distress Flagging Triggers (Non-blocking)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_community_post_distress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_matched TEXT;
BEGIN
  v_matched := public.find_distress_phrase(COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
  IF v_matched IS NOT NULL THEN
    NEW.distress_flagged := true;
    INSERT INTO public.moderation_queue (
      content_type, content_id, author_id, matched_phrase, source, status
    ) VALUES (
      'post', NEW.id, NEW.author_id, v_matched, 'keyword', 'new'
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block or fail a post because of a moderation queue issue
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_posts_distress ON public.community_posts;
CREATE TRIGGER trg_community_posts_distress
  BEFORE INSERT OR UPDATE OF title, content ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.check_community_post_distress();

CREATE OR REPLACE FUNCTION public.check_post_comment_distress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_matched TEXT;
BEGIN
  v_matched := public.find_distress_phrase(COALESCE(NEW.content, ''));
  IF v_matched IS NOT NULL THEN
    NEW.distress_flagged := true;
    INSERT INTO public.moderation_queue (
      content_type, content_id, author_id, matched_phrase, source, status
    ) VALUES (
      'comment', NEW.id, NEW.user_id, v_matched, 'keyword', 'new'
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_comments_distress ON public.post_comments;
CREATE TRIGGER trg_post_comments_distress
  BEFORE INSERT OR UPDATE OF content ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.check_post_comment_distress();

-- -----------------------------------------------------------------------------
-- 7. Moderation RPCs (Admin-Gated & Audited)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_moderation_queue()
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_id UUID,
  content_title TEXT,
  content_snippet TEXT,
  is_anonymous BOOLEAN,
  author_revealed BOOLEAN,
  author_id UUID,
  author_name TEXT,
  author_email TEXT,
  author_department TEXT,
  author_college_id TEXT,
  author_revealed_by_name TEXT,
  author_revealed_at TIMESTAMPTZ,
  author_reveal_reason TEXT,
  matched_phrase TEXT,
  source TEXT,
  reported_by_id UUID,
  reported_by_name TEXT,
  status TEXT,
  admin_notes TEXT,
  action_taken_at TIMESTAMPTZ,
  action_taken_by_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    mq.id,
    mq.content_type,
    mq.content_id,
    CASE WHEN mq.content_type = 'post' THEN p.title ELSE 'Comment on: ' || COALESCE(cp.title, 'post') END AS content_title,
    CASE WHEN mq.content_type = 'post' THEN left(p.content, 500) ELSE left(c.content, 500) END AS content_snippet,
    COALESCE(CASE WHEN mq.content_type = 'post' THEN p.is_anonymous ELSE c.is_anonymous END, false) AS is_anonymous,
    mq.author_revealed,
    CASE WHEN (NOT COALESCE(CASE WHEN mq.content_type = 'post' THEN p.is_anonymous ELSE c.is_anonymous END, false)) OR mq.author_revealed THEN u.id ELSE NULL END AS author_id,
    CASE WHEN (NOT COALESCE(CASE WHEN mq.content_type = 'post' THEN p.is_anonymous ELSE c.is_anonymous END, false)) OR mq.author_revealed THEN u.name ELSE 'Anonymous student (Protected)' END AS author_name,
    CASE WHEN (NOT COALESCE(CASE WHEN mq.content_type = 'post' THEN p.is_anonymous ELSE c.is_anonymous END, false)) OR mq.author_revealed THEN u.email ELSE NULL END AS author_email,
    CASE WHEN (NOT COALESCE(CASE WHEN mq.content_type = 'post' THEN p.is_anonymous ELSE c.is_anonymous END, false)) OR mq.author_revealed THEN u.department ELSE NULL END AS author_department,
    CASE WHEN (NOT COALESCE(CASE WHEN mq.content_type = 'post' THEN p.is_anonymous ELSE c.is_anonymous END, false)) OR mq.author_revealed THEN u.college_id ELSE NULL END AS author_college_id,
    rev_u.name AS author_revealed_by_name,
    mq.author_revealed_at,
    mq.author_reveal_reason,
    mq.matched_phrase,
    mq.source,
    mq.reported_by AS reported_by_id,
    rep_u.name AS reported_by_name,
    mq.status,
    mq.admin_notes,
    mq.action_taken_at,
    act_u.name AS action_taken_by_name,
    mq.created_at,
    mq.updated_at
  FROM public.moderation_queue mq
  LEFT JOIN public.community_posts p ON p.id = mq.content_id AND mq.content_type = 'post'
  LEFT JOIN public.post_comments c ON c.id = mq.content_id AND mq.content_type = 'comment'
  LEFT JOIN public.community_posts cp ON cp.id = c.post_id AND mq.content_type = 'comment'
  LEFT JOIN public.users u ON u.id = mq.author_id
  LEFT JOIN public.users rev_u ON rev_u.id = mq.author_revealed_by
  LEFT JOIN public.users rep_u ON rep_u.id = mq.reported_by
  LEFT JOIN public.users act_u ON act_u.id = mq.action_taken_by
  ORDER BY mq.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_moderation_queue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_moderation_queue() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reveal_moderation_author(
  p_queue_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_author_id UUID;
  v_result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A clear justification of at least 5 characters is required to reveal an author in crisis.'
      USING ERRCODE = '22023';
  END IF;

  SELECT author_id INTO v_author_id FROM public.moderation_queue WHERE id = p_queue_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Moderation entry not found' USING ERRCODE = 'P0002';
  END IF;

  v_admin_id := auth.uid();

  -- Update moderation entry
  UPDATE public.moderation_queue
     SET author_revealed = true,
         author_revealed_by = v_admin_id,
         author_revealed_at = now(),
         author_reveal_reason = btrim(p_reason),
         updated_at = now()
   WHERE id = p_queue_id;

  -- Log action to admin_audit_log
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (
    v_admin_id,
    'reveal_distress_author',
    v_author_id,
    jsonb_build_object(
      'moderation_queue_id', p_queue_id,
      'reason', btrim(p_reason),
      'revealed_at', now()
    )
  );

  -- Return unmasked author details to the authorized admin
  SELECT jsonb_build_object(
    'author_id', u.id,
    'name', u.name,
    'email', u.email,
    'department', u.department,
    'college_id', u.college_id,
    'revealed_at', now()
  ) INTO v_result
  FROM public.users u
  WHERE u.id = v_author_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.reveal_moderation_author(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_moderation_author(UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_moderation_status(
  p_queue_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('new', 'contacted', 'resolved') THEN
    RAISE EXCEPTION 'Invalid status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.moderation_queue
     SET status = p_status,
         admin_notes = COALESCE(p_notes, admin_notes),
         action_taken_at = COALESCE(action_taken_at, now()),
         action_taken_by = COALESCE(action_taken_by, auth.uid()),
         updated_at = now()
   WHERE id = p_queue_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_moderation_status(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_moderation_status(UUID, TEXT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.report_peer_concern(
  p_content_type TEXT,
  p_content_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_author_id UUID;
  v_queue_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be signed in to report a concern' USING ERRCODE = '42501';
  END IF;

  IF p_content_type = 'post' THEN
    SELECT author_id INTO v_author_id FROM public.community_posts WHERE id = p_content_id;
  ELSIF p_content_type = 'comment' THEN
    SELECT user_id INTO v_author_id FROM public.post_comments WHERE id = p_content_id;
  ELSE
    RAISE EXCEPTION 'Invalid content type' USING ERRCODE = '22023';
  END IF;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Target content not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.moderation_queue (
    content_type, content_id, author_id, source, reported_by, status, admin_notes
  ) VALUES (
    p_content_type, p_content_id, v_author_id, 'peer_report', auth.uid(), 'new', p_note
  )
  RETURNING id INTO v_queue_id;

  RETURN jsonb_build_object('success', true, 'queue_id', v_queue_id);
END;
$$;

REVOKE ALL ON FUNCTION public.report_peer_concern(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_peer_concern(TEXT, UUID, TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 8. Platform Settings (Keys created with NULL values only)
-- -----------------------------------------------------------------------------

INSERT INTO public.platform_settings (id, value)
VALUES
  ('wellbeing_counsellors', 'null'::jsonb),
  ('wellbeing_admin_phone', 'null'::jsonb),
  ('wellbeing_admin_label', 'null'::jsonb)
ON CONFLICT (id) DO NOTHING;
