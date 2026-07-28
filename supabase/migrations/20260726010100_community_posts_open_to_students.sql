-- =============================================================================
-- Open the community board to every student.
--
-- Previously community_posts.mentor_id had a hard FK to public.mentors and the
-- INSERT policy required a mentors row with department <> 'General'. That made
-- the board mentor-only — students, who are the ones actually looking for
-- hackathon partners and study help, could not post at all.
--
-- This migration introduces author_id (any user), keeps mentor_id mirrored so no
-- existing read path breaks, and adds feed RPCs that return the author's public
-- profile plus the caller's like state in a single round trip (the client was
-- doing one extra query per post to check likes).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- author_id
-- -----------------------------------------------------------------------------
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.users (id) ON DELETE CASCADE;

-- Only backfill where the mentor still resolves to a users row; assigning an
-- id that is not in public.users would trip the new foreign key and abort the
-- whole migration.
UPDATE public.community_posts p
SET author_id = p.mentor_id
WHERE p.author_id IS NULL
  AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.mentor_id);

-- Drop any row left without a resolvable author (orphaned by a deleted user)
-- so the NOT NULL below cannot fail.
DELETE FROM public.community_posts WHERE author_id IS NULL;

ALTER TABLE public.community_posts ALTER COLUMN author_id SET NOT NULL;

-- mentor_id is now a legacy mirror of author_id: no longer a foreign key into
-- mentors, and no longer required from the client.
ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS fk_mentor;
ALTER TABLE public.community_posts ALTER COLUMN mentor_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_community_post_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.author_id IS NULL THEN
    NEW.author_id := NEW.mentor_id;
  END IF;
  NEW.mentor_id := NEW.author_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_community_post_author ON public.community_posts;
CREATE TRIGGER trg_sync_community_post_author
  BEFORE INSERT OR UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_community_post_author();

CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON public.community_posts (author_id);

-- -----------------------------------------------------------------------------
-- Policies: any authenticated user may post as themselves
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Verified mentors can create posts"   ON public.community_posts;
DROP POLICY IF EXISTS "Mentors can update their own posts"  ON public.community_posts;
DROP POLICY IF EXISTS "Mentors can delete their own posts"  ON public.community_posts;

DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.community_posts;
CREATE POLICY "Authenticated users can create posts"
  ON public.community_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update their own posts" ON public.community_posts;
CREATE POLICY "Authors can update their own posts"
  ON public.community_posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can delete their own posts" ON public.community_posts;
CREATE POLICY "Authors can delete their own posts"
  ON public.community_posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Admins can moderate posts" ON public.community_posts;
CREATE POLICY "Admins can moderate posts"
  ON public.community_posts FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- -----------------------------------------------------------------------------
-- Feed RPCs
--
-- SECURITY DEFINER so the author's public profile fields can be joined in even
-- though public.users itself is not readable by anon (see users_public view).
-- Only non-sensitive columns are ever selected.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_community_feed(
  p_post_type TEXT    DEFAULT NULL,
  p_search    TEXT    DEFAULT NULL,
  p_limit     INTEGER DEFAULT 20,
  p_offset    INTEGER DEFAULT 0
)
RETURNS TABLE (
  id               UUID,
  title            TEXT,
  content          TEXT,
  post_type        TEXT,
  status           TEXT,
  tags             TEXT[],
  image_url        TEXT,
  likes_count      INTEGER,
  comments_count   INTEGER,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  author_id        UUID,
  author_name      TEXT,
  author_image     TEXT,
  author_department TEXT,
  author_role      TEXT,
  author_is_mentor BOOLEAN,
  viewer_has_liked BOOLEAN,
  viewer_is_author BOOLEAN,
  total_count      BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  WITH filtered AS (
    SELECT p.*
    FROM public.community_posts p
    WHERE (p_post_type IS NULL OR p_post_type = 'all' OR p.post_type = p_post_type)
      AND (
        p_search IS NULL OR btrim(p_search) = ''
        OR p.title   ILIKE '%' || p_search || '%'
        OR p.content ILIKE '%' || p_search || '%'
        OR EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE '%' || p_search || '%')
      )
  )
  SELECT
    f.id, f.title, f.content, f.post_type, f.status, f.tags, f.image_url,
    f.likes_count, f.comments_count, f.created_at, f.updated_at,
    f.author_id,
    u.name,
    u.profile_image,
    u.department,
    u.role,
    EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = f.author_id AND m.department <> 'General'),
    EXISTS (SELECT 1 FROM public.post_likes l WHERE l.post_id = f.id AND l.user_id = auth.uid()),
    (f.author_id = auth.uid()),
    (SELECT COUNT(*) FROM filtered)
  FROM filtered f
  LEFT JOIN public.users u ON u.id = f.author_id
  ORDER BY f.created_at DESC
  LIMIT GREATEST(LEAST(p_limit, 100), 1)
  OFFSET GREATEST(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.get_community_post(p_post_id UUID)
RETURNS TABLE (
  id               UUID,
  title            TEXT,
  content          TEXT,
  post_type        TEXT,
  status           TEXT,
  tags             TEXT[],
  image_url        TEXT,
  likes_count      INTEGER,
  comments_count   INTEGER,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  author_id        UUID,
  author_name      TEXT,
  author_image     TEXT,
  author_department TEXT,
  author_role      TEXT,
  author_is_mentor BOOLEAN,
  viewer_has_liked BOOLEAN,
  viewer_is_author BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id, p.title, p.content, p.post_type, p.status, p.tags, p.image_url,
    p.likes_count, p.comments_count, p.created_at, p.updated_at,
    p.author_id,
    u.name,
    u.profile_image,
    u.department,
    u.role,
    EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = p.author_id AND m.department <> 'General'),
    EXISTS (SELECT 1 FROM public.post_likes l WHERE l.post_id = p.id AND l.user_id = auth.uid()),
    (p.author_id = auth.uid())
  FROM public.community_posts p
  LEFT JOIN public.users u ON u.id = p.author_id
  WHERE p.id = p_post_id;
$$;

-- Comment authors come from public.users too, and anon cannot read that table.
CREATE OR REPLACE FUNCTION public.get_post_comments(p_post_id UUID)
RETURNS TABLE (
  id               UUID,
  content          TEXT,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  author_id        UUID,
  author_name      TEXT,
  author_image     TEXT,
  viewer_is_author BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT c.id, c.content, c.created_at, c.updated_at,
         c.user_id, u.name, u.profile_image, (c.user_id = auth.uid())
  FROM public.post_comments c
  LEFT JOIN public.users u ON u.id = c.user_id
  WHERE c.post_id = p_post_id
  ORDER BY c.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_community_feed(TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_post(UUID)                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_comments(UUID)                           TO anon, authenticated;
