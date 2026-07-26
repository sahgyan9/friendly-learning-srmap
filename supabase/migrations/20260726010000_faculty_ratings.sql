-- =============================================================================
-- Faculty directory + anonymous multi-criteria faculty ratings
--
-- The faculty directory is synced from the SRM University-AP WordPress REST API
-- (post type `faculty-profile`) by the `sync-faculty` edge function, keyed on the
-- profile slug so re-syncs are idempotent and new hires appear automatically.
--
-- Ratings are ANONYMOUS: reviewer_id is stored only to enforce one rating per
-- student and to let a student edit their own. It is never exposed. There is no
-- public SELECT policy on faculty_ratings; all public reads go through the
-- SECURITY DEFINER RPCs below, which never return reviewer_id.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shared updated_at trigger helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- faculty
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faculty (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  designation   TEXT,
  department    TEXT NOT NULL DEFAULT 'General',
  school        TEXT,
  profile_url   TEXT,
  image_url     TEXT,
  source        TEXT NOT NULL DEFAULT 'srmap-directory',
  is_active     BOOLEAN NOT NULL DEFAULT true,

  -- Denormalised aggregates, maintained by trg_faculty_rating_stats.
  rating_count      INTEGER NOT NULL DEFAULT 0,
  avg_overall       NUMERIC(3, 2) NOT NULL DEFAULT 0,
  avg_teaching      NUMERIC(3, 2) NOT NULL DEFAULT 0,
  avg_grading       NUMERIC(3, 2) NOT NULL DEFAULT 0,
  avg_helpfulness   NUMERIC(3, 2) NOT NULL DEFAULT 0,

  last_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faculty_department ON public.faculty (department);
CREATE INDEX IF NOT EXISTS idx_faculty_school     ON public.faculty (school);
CREATE INDEX IF NOT EXISTS idx_faculty_active     ON public.faculty (is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_faculty_rating     ON public.faculty (avg_overall DESC, rating_count DESC);

-- No trigram index: the directory is ~600 rows, so a sequential ILIKE scan is
-- already sub-millisecond and enabling pg_trgm would add a schema-placement
-- dependency for no measurable gain.

ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view faculty" ON public.faculty;
CREATE POLICY "Anyone can view faculty"
  ON public.faculty FOR SELECT
  USING (is_active);

-- Writes are service-role (sync function) or admin only. No policy is granted to
-- anon/authenticated for INSERT/UPDATE/DELETE, so RLS denies them by default;
-- the service role bypasses RLS entirely.
DROP POLICY IF EXISTS "Admins can manage faculty" ON public.faculty;
CREATE POLICY "Admins can manage faculty"
  ON public.faculty FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

DROP TRIGGER IF EXISTS trg_faculty_updated_at ON public.faculty;
CREATE TRIGGER trg_faculty_updated_at
  BEFORE UPDATE ON public.faculty
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- faculty_ratings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faculty_ratings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id   UUID NOT NULL REFERENCES public.faculty (id) ON DELETE CASCADE,
  reviewer_id  UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,

  teaching     SMALLINT NOT NULL CHECK (teaching    BETWEEN 1 AND 5),
  grading      SMALLINT NOT NULL CHECK (grading     BETWEEN 1 AND 5),
  helpfulness  SMALLINT NOT NULL CHECK (helpfulness BETWEEN 1 AND 5),

  -- Single headline number, always consistent with the three criteria.
  overall NUMERIC(3, 2) GENERATED ALWAYS AS
    ((teaching + grading + helpfulness)::NUMERIC / 3) STORED,

  comment      TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
  course_code  TEXT CHECK (course_code IS NULL OR char_length(course_code) <= 32),
  tags         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  helpful_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One rating per student per faculty member.
  UNIQUE (faculty_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_faculty_ratings_faculty ON public.faculty_ratings (faculty_id, created_at DESC);

ALTER TABLE public.faculty_ratings ENABLE ROW LEVEL SECURITY;

-- Deliberately NO public SELECT policy. A student may read back only their own
-- row, which is what the "you already rated this" / edit flow needs.
DROP POLICY IF EXISTS "Users can view their own faculty rating" ON public.faculty_ratings;
CREATE POLICY "Users can view their own faculty rating"
  ON public.faculty_ratings FOR SELECT
  TO authenticated
  USING (reviewer_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own faculty rating" ON public.faculty_ratings;
CREATE POLICY "Users can insert their own faculty rating"
  ON public.faculty_ratings FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own faculty rating" ON public.faculty_ratings;
CREATE POLICY "Users can update their own faculty rating"
  ON public.faculty_ratings FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own faculty rating" ON public.faculty_ratings;
CREATE POLICY "Users can delete their own faculty rating"
  ON public.faculty_ratings FOR DELETE
  TO authenticated
  USING (reviewer_id = auth.uid());

DROP TRIGGER IF EXISTS trg_faculty_ratings_updated_at ON public.faculty_ratings;
CREATE TRIGGER trg_faculty_ratings_updated_at
  BEFORE UPDATE ON public.faculty_ratings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- faculty_review_votes — "was this review helpful?"
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faculty_review_votes (
  rating_id  UUID NOT NULL REFERENCES public.faculty_ratings (id) ON DELETE CASCADE,
  voter_id   UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (rating_id, voter_id)
);

ALTER TABLE public.faculty_review_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own review votes" ON public.faculty_review_votes;
CREATE POLICY "Users can view their own review votes"
  ON public.faculty_review_votes FOR SELECT
  TO authenticated
  USING (voter_id = auth.uid());

DROP POLICY IF EXISTS "Users can cast their own review vote" ON public.faculty_review_votes;
CREATE POLICY "Users can cast their own review vote"
  ON public.faculty_review_votes FOR INSERT
  TO authenticated
  WITH CHECK (voter_id = auth.uid());

DROP POLICY IF EXISTS "Users can retract their own review vote" ON public.faculty_review_votes;
CREATE POLICY "Users can retract their own review vote"
  ON public.faculty_review_votes FOR DELETE
  TO authenticated
  USING (voter_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Aggregate maintenance
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_faculty_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target UUID := COALESCE(NEW.faculty_id, OLD.faculty_id);
BEGIN
  UPDATE public.faculty f
  SET rating_count    = s.n,
      avg_overall     = s.overall,
      avg_teaching    = s.teaching,
      avg_grading     = s.grading,
      avg_helpfulness = s.helpfulness
  FROM (
    SELECT
      COUNT(*)                                  AS n,
      COALESCE(AVG(overall),     0)::NUMERIC(3,2) AS overall,
      COALESCE(AVG(teaching),    0)::NUMERIC(3,2) AS teaching,
      COALESCE(AVG(grading),     0)::NUMERIC(3,2) AS grading,
      COALESCE(AVG(helpfulness), 0)::NUMERIC(3,2) AS helpfulness
    FROM public.faculty_ratings
    WHERE faculty_id = target
  ) s
  WHERE f.id = target;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_faculty_rating_stats ON public.faculty_ratings;
CREATE TRIGGER trg_faculty_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.faculty_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_faculty_rating_stats();

CREATE OR REPLACE FUNCTION public.update_faculty_review_helpful_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target UUID := COALESCE(NEW.rating_id, OLD.rating_id);
BEGIN
  UPDATE public.faculty_ratings
  SET helpful_count = (SELECT COUNT(*) FROM public.faculty_review_votes WHERE rating_id = target)
  WHERE id = target;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_faculty_review_helpful_count ON public.faculty_review_votes;
CREATE TRIGGER trg_faculty_review_helpful_count
  AFTER INSERT OR DELETE ON public.faculty_review_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_faculty_review_helpful_count();

-- -----------------------------------------------------------------------------
-- Anonymous read RPCs
-- -----------------------------------------------------------------------------

-- Reviews for one faculty member, with the caller's own vote state, and never a
-- reviewer identity. SECURITY DEFINER because faculty_ratings has no public
-- SELECT policy — this function is the only way to read other people's reviews.
CREATE OR REPLACE FUNCTION public.get_faculty_reviews(p_faculty_id UUID)
RETURNS TABLE (
  id            UUID,
  teaching      SMALLINT,
  grading       SMALLINT,
  helpfulness   SMALLINT,
  overall       NUMERIC,
  comment       TEXT,
  course_code   TEXT,
  tags          TEXT[],
  helpful_count INTEGER,
  viewer_voted  BOOLEAN,
  is_own        BOOLEAN,
  created_at    TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    r.id, r.teaching, r.grading, r.helpfulness, r.overall,
    r.comment, r.course_code, r.tags, r.helpful_count,
    EXISTS (
      SELECT 1 FROM public.faculty_review_votes v
      WHERE v.rating_id = r.id AND v.voter_id = auth.uid()
    ) AS viewer_voted,
    (r.reviewer_id = auth.uid()) AS is_own,
    r.created_at
  FROM public.faculty_ratings r
  WHERE r.faculty_id = p_faculty_id
  ORDER BY r.helpful_count DESC, r.created_at DESC;
$$;

-- Tag histogram for a faculty member, used for the "what students say" chips.
CREATE OR REPLACE FUNCTION public.get_faculty_tag_counts(p_faculty_id UUID)
RETURNS TABLE (tag TEXT, count BIGINT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT t.tag, COUNT(*) AS count
  FROM public.faculty_ratings r
  CROSS JOIN LATERAL unnest(r.tags) AS t (tag)
  WHERE r.faculty_id = p_faculty_id
  GROUP BY t.tag
  ORDER BY count DESC, t.tag;
$$;

-- Leaderboard. Requires a minimum sample so a single 5-star rating cannot top
-- the chart.
CREATE OR REPLACE FUNCTION public.get_top_rated_faculty(
  p_limit       INTEGER DEFAULT 10,
  p_min_ratings INTEGER DEFAULT 3
)
RETURNS TABLE (
  id           UUID,
  slug         TEXT,
  name         TEXT,
  designation  TEXT,
  department   TEXT,
  school       TEXT,
  image_url    TEXT,
  avg_overall  NUMERIC,
  rating_count INTEGER
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT f.id, f.slug, f.name, f.designation, f.department, f.school,
         f.image_url, f.avg_overall, f.rating_count
  FROM public.faculty f
  WHERE f.is_active AND f.rating_count >= GREATEST(p_min_ratings, 1)
  ORDER BY f.avg_overall DESC, f.rating_count DESC
  LIMIT GREATEST(LEAST(p_limit, 50), 1);
$$;

-- Platform-wide counters for the discovery card ("N faculty · M ratings").
CREATE OR REPLACE FUNCTION public.get_faculty_directory_stats()
RETURNS TABLE (faculty_count BIGINT, rating_count BIGINT, department_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.faculty WHERE is_active),
    (SELECT COUNT(*) FROM public.faculty_ratings),
    (SELECT COUNT(DISTINCT department) FROM public.faculty WHERE is_active);
$$;

GRANT EXECUTE ON FUNCTION public.get_faculty_reviews(UUID)              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_faculty_tag_counts(UUID)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_rated_faculty(INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_faculty_directory_stats()          TO anon, authenticated;
