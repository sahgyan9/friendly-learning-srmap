-- =============================================================================
-- Blog Posts
--
-- Adds public.blog_posts — long-form content any signed-in student or mentor
-- writes and formats themselves, at /blogs (distinct from /blog, the 4
-- hardcoded editorial posts in src/data/blog-posts.ts, which this does not
-- touch). Structurally this is knowledge_articles' pipeline (rich-text
-- content, a projector, an immediate-reproject-on-write trigger) crossed with
-- community_posts' RLS shape (self-write/self-update/self-delete, admin can
-- moderate) instead of knowledge_articles' admin-only shape, because this
-- content is self-serve rather than admin-authored.
--
-- content_html is sanitized client-side (DOMPurify) before it ever reaches
-- this table, both on save and again on render — see
-- src/lib/sanitize-html.ts. That is a UX safety net, not a hard security
-- boundary: this is a client-only SPA with no write-gateway API, so a client
-- that bypasses the app's own JS could still insert unsanitized HTML with a
-- valid JWT. The read-time sanitize pass in BlogPostDetail.tsx is what
-- actually protects other readers regardless of how a bad row got in.
--
-- author_id/author_name/author_image are NOT denormalized onto the row.
-- public.users is owner-only SELECT (RLS), so a byline needs a SECURITY
-- DEFINER function that joins it server-side — same reasoning as
-- get_community_feed()/get_community_post() in 20260731090000_communities.sql.
-- Direct writes (INSERT/UPDATE/DELETE) stay on the table itself, gated by RLS,
-- exactly like community_posts — only reads need the RPC layer.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  cover_image_url TEXT,
  content_html TEXT NOT NULL,
  content_text TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  author_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  -- Defaults FALSE, unlike knowledge_articles' TRUE: a half-written self-serve
  -- draft should not go live/searchable the instant someone hits save the
  -- way a trusted admin's finished write does.
  is_published BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON public.blog_posts USING GIN(tags);

-- Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_posts' AND policyname = 'Anyone can view published blog posts'
  ) THEN
    CREATE POLICY "Anyone can view published blog posts"
      ON public.blog_posts FOR SELECT
      USING (is_published = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_posts' AND policyname = 'Authors can view their own blog posts'
  ) THEN
    -- Additive to "Anyone can view published..." above (Postgres unions
    -- multiple permissive SELECT policies with OR) — an author previewing
    -- their own draft, or the edit page loading it, needs this even though
    -- it is not published yet.
    CREATE POLICY "Authors can view their own blog posts"
      ON public.blog_posts FOR SELECT TO authenticated
      USING (author_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_posts' AND policyname = 'Admins can view all blog posts'
  ) THEN
    CREATE POLICY "Admins can view all blog posts"
      ON public.blog_posts FOR SELECT TO authenticated
      USING (public.is_admin_user(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_posts' AND policyname = 'Authenticated users can create blog posts'
  ) THEN
    CREATE POLICY "Authenticated users can create blog posts"
      ON public.blog_posts FOR INSERT TO authenticated
      WITH CHECK (author_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_posts' AND policyname = 'Authors can update their own blog posts'
  ) THEN
    CREATE POLICY "Authors can update their own blog posts"
      ON public.blog_posts FOR UPDATE TO authenticated
      USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_posts' AND policyname = 'Authors can delete their own blog posts'
  ) THEN
    CREATE POLICY "Authors can delete their own blog posts"
      ON public.blog_posts FOR DELETE TO authenticated
      USING (author_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_posts' AND policyname = 'Admins can moderate blog posts'
  ) THEN
    CREATE POLICY "Admins can moderate blog posts"
      ON public.blog_posts FOR ALL TO authenticated
      USING (public.is_admin_user(auth.uid()))
      WITH CHECK (public.is_admin_user(auth.uid()));
  END IF;
END $$;

-- Explicit REVOKE before GRANT: Supabase's default privileges hand every new
-- table full rights to anon/authenticated regardless of RLS. This exact gap
-- bit knowledge_articles twice after the fact (20260821220000, 20260821230000)
-- — doing it up front here instead of as a follow-up fix.
REVOKE ALL ON public.blog_posts FROM anon, authenticated;
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

-- updated_at bookkeeping
CREATE OR REPLACE FUNCTION public.blog_posts_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.blog_posts_set_updated_at();

-- published_at is set once, on the first false->true transition, and never
-- overwritten by a later edit — distinct from updated_at, which every save
-- bumps. The sitemap's <lastmod> and any "recently published" sort want both
-- signals kept apart.
CREATE OR REPLACE FUNCTION public.blog_posts_set_published_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_published AND NEW.published_at IS NULL
     AND (TG_OP = 'INSERT' OR NOT OLD.is_published) THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_published_at ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_published_at
  BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.blog_posts_set_published_at();

-- =============================================================================
-- Projector function for knowledge_chunks, entity_type 'blog_post'.
-- Same content_hash cache-busting idiom as rebuild_article_chunks(): editing a
-- post nulls its chunk's embedding/embedded_at only when the indexed text
-- actually changed, so embed-knowledge re-embeds it without needing to
-- rebuild every chunk on every edit.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rebuild_blog_post_chunks()
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
      b.id,
      b.title,
      NULLIF(array_to_string(b.tags, ', '), '') AS subtitle,
      concat_ws('. ', b.title, b.excerpt, b.content_text) AS body,
      jsonb_build_object(
        'slug', b.slug,
        'author_id', b.author_id,
        'tags', b.tags,
        'cover_image_url', b.cover_image_url
      ) AS metadata,
      '/blogs/' || b.slug AS source_path
    FROM public.blog_posts b
    WHERE b.is_published
  )
  INSERT INTO public.knowledge_chunks
    (entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'blog_post', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path, md5(s.body)
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
  WHERE kc.entity_type = 'blog_post'
    AND NOT EXISTS (
      SELECT 1 FROM public.blog_posts b
      WHERE b.id = kc.entity_id AND b.is_published
    );

  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_blog_post_chunks() FROM PUBLIC, anon, authenticated;

-- A published/edited post shouldn't wait for the hourly rebuild_knowledge_chunks()
-- cron to show up in search/Ask AI — reproject immediately, same idiom as
-- knowledge_articles_reproject (20260821210000_knowledge_articles.sql:183-198).
CREATE OR REPLACE FUNCTION public.blog_posts_reproject()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  PERFORM public.rebuild_blog_post_chunks();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_reproject ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_reproject
  AFTER INSERT OR UPDATE ON public.blog_posts
  FOR EACH STATEMENT EXECUTE FUNCTION public.blog_posts_reproject();

REVOKE ALL ON FUNCTION public.blog_posts_reproject() FROM PUBLIC, anon, authenticated;

-- Master rebuild function update. Signature (return type) is unchanged from
-- knowledge_articles' version, so CREATE OR REPLACE is enough — the DROP
-- FUNCTION idiom used there is only needed when an OUT parameter is renamed.
CREATE OR REPLACE FUNCTION public.rebuild_knowledge_chunks()
RETURNS TABLE(entity TEXT, count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT 'faculty'::TEXT, public.rebuild_faculty_chunks();
  RETURN QUERY SELECT 'mentor'::TEXT,  public.rebuild_mentor_chunks();
  RETURN QUERY SELECT 'opportunity'::TEXT, public.rebuild_opportunity_chunks();
  RETURN QUERY SELECT 'document'::TEXT, public.rebuild_document_chunks();
  RETURN QUERY SELECT 'notice'::TEXT, public.rebuild_notice_chunks();
  RETURN QUERY SELECT 'article'::TEXT, public.rebuild_article_chunks();
  RETURN QUERY SELECT 'blog_post'::TEXT, public.rebuild_blog_post_chunks();
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_knowledge_chunks() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- Author-joined reads. public.users is owner-only SELECT (RLS), so a byline
-- needs a SECURITY DEFINER function rather than a client-side join — same
-- reasoning, same idiom, as get_community_feed()/get_community_post()
-- (20260731090000_communities.sql:500-575). Each function replicates the
-- table's own SELECT-visibility rule in its WHERE clause, because a SECURITY
-- DEFINER function bypasses RLS on the tables it queries rather than
-- inheriting it.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_blog_posts(TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_blog_posts(
  p_search TEXT DEFAULT NULL,
  p_tag TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, slug TEXT, title TEXT, excerpt TEXT, cover_image_url TEXT,
  tags TEXT[], author_id UUID, author_name TEXT, author_image TEXT,
  published_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  view_count INTEGER, total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH filtered AS (
    SELECT b.*
    FROM public.blog_posts b
    WHERE b.is_published = true
      AND (p_tag IS NULL OR btrim(p_tag) = '' OR p_tag = ANY(b.tags))
      AND (
        p_search IS NULL OR btrim(p_search) = ''
        OR b.title ILIKE '%' || p_search || '%'
        OR b.excerpt ILIKE '%' || p_search || '%'
      )
  )
  SELECT f.id, f.slug, f.title, f.excerpt, f.cover_image_url, f.tags,
         f.author_id, u.name, u.profile_image,
         f.published_at, f.created_at, f.updated_at, f.view_count,
         (SELECT count(*) FROM filtered)
  FROM filtered f
  LEFT JOIN public.users u ON u.id = f.author_id
  ORDER BY f.published_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50))
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_blog_posts(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_blog_posts(TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_blog_post_by_slug(TEXT);

CREATE OR REPLACE FUNCTION public.get_blog_post_by_slug(p_slug TEXT)
RETURNS TABLE (
  id UUID, slug TEXT, title TEXT, excerpt TEXT, cover_image_url TEXT,
  content_html TEXT, content_text TEXT, tags TEXT[],
  author_id UUID, author_name TEXT, author_image TEXT,
  is_published BOOLEAN, view_count INTEGER,
  published_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- Same visibility rule as the table's own RLS (published, or the viewer is
  -- the author previewing a draft, or an admin) — replicated here because
  -- SECURITY DEFINER bypasses RLS on the tables it reads.
  SELECT b.id, b.slug, b.title, b.excerpt, b.cover_image_url,
         b.content_html, b.content_text, b.tags,
         b.author_id, u.name, u.profile_image,
         b.is_published, b.view_count, b.published_at, b.created_at, b.updated_at
  FROM public.blog_posts b
  LEFT JOIN public.users u ON u.id = b.author_id
  WHERE b.slug = p_slug
    AND (b.is_published = true OR b.author_id = auth.uid() OR public.is_admin_user(auth.uid()));
$$;

REVOKE ALL ON FUNCTION public.get_blog_post_by_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_blog_post_by_slug(TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_my_blog_posts();

CREATE OR REPLACE FUNCTION public.get_my_blog_posts()
RETURNS TABLE (
  id UUID, slug TEXT, title TEXT, excerpt TEXT, cover_image_url TEXT,
  is_published BOOLEAN, view_count INTEGER,
  published_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT b.id, b.slug, b.title, b.excerpt, b.cover_image_url,
         b.is_published, b.view_count, b.published_at, b.created_at, b.updated_at
  FROM public.blog_posts b
  WHERE b.author_id = auth.uid()
  ORDER BY b.updated_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_blog_posts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_blog_posts() TO authenticated;

-- Best-effort view counter, called fire-and-forget from BlogPostDetail.tsx.
-- SECURITY DEFINER because anon/authenticated have no direct UPDATE grant on
-- the table (writes are author-only via RLS) — a reader who is not the
-- author still needs to be able to bump this.
DROP FUNCTION IF EXISTS public.increment_blog_post_views(TEXT);

CREATE OR REPLACE FUNCTION public.increment_blog_post_views(p_slug TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.blog_posts SET view_count = view_count + 1
  WHERE slug = p_slug AND is_published = true;
$$;

REVOKE ALL ON FUNCTION public.increment_blog_post_views(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_blog_post_views(TEXT) TO anon, authenticated;

-- =============================================================================
-- Storage bucket for cover images and inline body images. A dedicated bucket
-- rather than reusing community-posts: different lifecycle (a cover image
-- plus N inline images per post, referenced from content_html after
-- crop/insert), and it avoids ever having to disambiguate "is this upload a
-- community post image or a blog image" in shared code or RLS. Bucket id
-- 'blog-posts' deliberately matches the table name — this repo has hit the
-- id-vs-display-name bucket bug once already (20260821100000).
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('blog-posts', 'blog-posts', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Users can upload their own blog post images'
  ) THEN
    CREATE POLICY "Users can upload their own blog post images"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'blog-posts' AND owner = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Users can update their own blog post images'
  ) THEN
    CREATE POLICY "Users can update their own blog post images"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'blog-posts' AND owner = auth.uid())
      WITH CHECK (bucket_id = 'blog-posts' AND owner = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Users can delete their own blog post images'
  ) THEN
    CREATE POLICY "Users can delete their own blog post images"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'blog-posts' AND owner = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Public can view blog post images'
  ) THEN
    CREATE POLICY "Public can view blog post images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'blog-posts');
  END IF;
END $$;
