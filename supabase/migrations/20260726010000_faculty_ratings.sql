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
--
-- UPGRADE-SAFE. An earlier single-score faculty schema was applied to some
-- databases (faculty.avg_rating, faculty_ratings.rating) and then reverted in
-- the codebase but not in the database. Every statement here is written to run
-- correctly both on a clean database and on top of that older schema, which it
-- migrates in place: existing single scores are carried over to all three
-- criteria and no ratings are lost.
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

-- Bring a pre-existing `faculty` table (older single-score schema) up to the
-- shape above. All no-ops on a table just created by the statement above.
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS slug            TEXT;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS designation     TEXT;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS school          TEXT;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS profile_url     TEXT;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS image_url       TEXT;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS source          TEXT NOT NULL DEFAULT 'srmap-directory';
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS is_active       BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS rating_count    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS avg_overall     NUMERIC(3,2) NOT NULL DEFAULT 0;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS avg_teaching    NUMERIC(3,2) NOT NULL DEFAULT 0;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS avg_grading     NUMERIC(3,2) NOT NULL DEFAULT 0;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS avg_helpfulness NUMERIC(3,2) NOT NULL DEFAULT 0;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS last_synced_at  TIMESTAMPTZ;

DO $$
BEGIN
  -- Carry over the old single average, and the old profile_image column, if the
  -- older schema is what we are sitting on.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'faculty' AND column_name = 'avg_rating') THEN
    EXECUTE 'UPDATE public.faculty SET avg_overall = COALESCE(avg_rating, 0) WHERE avg_overall = 0';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'faculty' AND column_name = 'profile_image') THEN
    EXECUTE 'UPDATE public.faculty SET image_url = profile_image WHERE image_url IS NULL';
  END IF;
END $$;

-- Backfill slug for pre-existing rows, then make it a real key. Names are
-- slugified the same way WordPress does, and collisions get a numeric suffix so
-- the unique index below cannot fail.
UPDATE public.faculty
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'))
WHERE slug IS NULL OR btrim(slug) = '';

UPDATE public.faculty f
SET slug = f.slug || '-' || d.n
FROM (
  SELECT id, row_number() OVER (PARTITION BY slug ORDER BY created_at, id) AS n
  FROM public.faculty
) d
WHERE f.id = d.id AND d.n > 1;

-- Any row whose name slugified to nothing still needs a value.
UPDATE public.faculty SET slug = 'faculty-' || id WHERE slug IS NULL OR btrim(slug) = '';

ALTER TABLE public.faculty ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS faculty_slug_key ON public.faculty (slug);

CREATE INDEX IF NOT EXISTS idx_faculty_department ON public.faculty (department);
CREATE INDEX IF NOT EXISTS idx_faculty_school     ON public.faculty (school);
CREATE INDEX IF NOT EXISTS idx_faculty_active     ON public.faculty (is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_faculty_rating     ON public.faculty (avg_overall DESC, rating_count DESC);

-- No trigram index: the directory is ~600 rows, so a sequential ILIKE scan is
-- already sub-millisecond and enabling pg_trgm would add a schema-placement
-- dependency for no measurable gain.

ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;

-- Older policy names, superseded by the two below. The old SELECT policy used
-- USING (true), which would keep deactivated faculty publicly visible.
DROP POLICY IF EXISTS "Only admins can insert faculty" ON public.faculty;
DROP POLICY IF EXISTS "Only admins can update faculty" ON public.faculty;
DROP POLICY IF EXISTS "Only admins can delete faculty" ON public.faculty;

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

-- Retire the legacy aggregate trigger BEFORE touching any data. Its function
-- body reads faculty_ratings.rating, so leaving it attached while that column is
-- migrated and dropped makes every subsequent UPDATE/DELETE fail. The new
-- trigger is installed further down, and aggregates are recomputed at the end.
DROP TRIGGER IF EXISTS trg_faculty_rating_stats ON public.faculty_ratings;

-- Bring a pre-existing `faculty_ratings` table up to the shape above. The older
-- schema had a single `rating` column; that score is copied onto all three
-- criteria so no student's rating is lost.
ALTER TABLE public.faculty_ratings ADD COLUMN IF NOT EXISTS teaching      SMALLINT;
ALTER TABLE public.faculty_ratings ADD COLUMN IF NOT EXISTS grading       SMALLINT;
ALTER TABLE public.faculty_ratings ADD COLUMN IF NOT EXISTS helpfulness   SMALLINT;
ALTER TABLE public.faculty_ratings ADD COLUMN IF NOT EXISTS course_code   TEXT;
ALTER TABLE public.faculty_ratings ADD COLUMN IF NOT EXISTS tags          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.faculty_ratings ADD COLUMN IF NOT EXISTS helpful_count INTEGER NOT NULL DEFAULT 0;

DO $$
DECLARE
  has_legacy_rating BOOLEAN := EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'faculty_ratings' AND column_name = 'rating'
  );
BEGIN
  IF has_legacy_rating THEN
    EXECUTE $sql$
      UPDATE public.faculty_ratings
      SET teaching    = COALESCE(teaching,    rating),
          grading     = COALESCE(grading,     rating),
          helpfulness = COALESCE(helpfulness, rating)
      WHERE teaching IS NULL OR grading IS NULL OR helpfulness IS NULL
    $sql$;
  END IF;

  -- Anything still null (should be nothing) gets a neutral 3 so NOT NULL holds.
  UPDATE public.faculty_ratings
  SET teaching    = COALESCE(teaching, 3),
      grading     = COALESCE(grading, 3),
      helpfulness = COALESCE(helpfulness, 3)
  WHERE teaching IS NULL OR grading IS NULL OR helpfulness IS NULL;

  ALTER TABLE public.faculty_ratings ALTER COLUMN teaching    SET NOT NULL;
  ALTER TABLE public.faculty_ratings ALTER COLUMN grading     SET NOT NULL;
  ALTER TABLE public.faculty_ratings ALTER COLUMN helpfulness SET NOT NULL;

  -- The legacy single score is now redundant, and it is NOT NULL, which would
  -- block every insert from the new client.
  IF has_legacy_rating THEN
    EXECUTE 'ALTER TABLE public.faculty_ratings DROP COLUMN rating';
  END IF;
END $$;

-- Range checks (added separately so they apply to upgraded tables too).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'faculty_ratings_criteria_range') THEN
    ALTER TABLE public.faculty_ratings ADD CONSTRAINT faculty_ratings_criteria_range
      CHECK (teaching BETWEEN 1 AND 5 AND grading BETWEEN 1 AND 5 AND helpfulness BETWEEN 1 AND 5);
  END IF;
END $$;

-- `overall` is generated, so it can only be added once the three criteria exist
-- and are NOT NULL.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'faculty_ratings' AND column_name = 'overall') THEN
    ALTER TABLE public.faculty_ratings
      ADD COLUMN overall NUMERIC(3,2)
      GENERATED ALWAYS AS ((teaching + grading + helpfulness)::NUMERIC / 3) STORED;
  END IF;
END $$;

-- The older schema capped comments at 500 characters; the new modal allows 1000.
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.faculty_ratings'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%char_length(comment)%'
  LOOP
    EXECUTE format('ALTER TABLE public.faculty_ratings DROP CONSTRAINT %I', con.conname);
  END LOOP;

  ALTER TABLE public.faculty_ratings ADD CONSTRAINT faculty_ratings_comment_length
    CHECK (comment IS NULL OR char_length(comment) <= 1000);
END $$;

CREATE INDEX IF NOT EXISTS idx_faculty_ratings_faculty ON public.faculty_ratings (faculty_id, created_at DESC);

ALTER TABLE public.faculty_ratings ENABLE ROW LEVEL SECURITY;

-- Older policy names, superseded by the ones below.
DROP POLICY IF EXISTS "Users can view their own ratings only"          ON public.faculty_ratings;
DROP POLICY IF EXISTS "Authenticated users can insert their own rating" ON public.faculty_ratings;
DROP POLICY IF EXISTS "Users can update their own rating"              ON public.faculty_ratings;
DROP POLICY IF EXISTS "Users can delete their own rating"              ON public.faculty_ratings;

-- The older schema left reviewer_id unconstrained, so deleting a user orphaned
-- their ratings instead of removing them.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.faculty_ratings'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) ILIKE '%REFERENCES users(id)%'
  ) THEN
    DELETE FROM public.faculty_ratings r
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = r.reviewer_id);

    ALTER TABLE public.faculty_ratings
      ADD CONSTRAINT faculty_ratings_reviewer_id_fkey
      FOREIGN KEY (reviewer_id) REFERENCES public.users (id) ON DELETE CASCADE;
  END IF;
END $$;

-- The old single-score read RPC selects faculty_ratings.rating, which no longer
-- exists. It is superseded by get_faculty_reviews below.
DROP FUNCTION IF EXISTS public.get_faculty_ratings(UUID);

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

-- The legacy trigger was detached before the data migration above, so nothing
-- recalculated the aggregates while rows were being reshaped. Recompute every
-- faculty member once, from scratch, so the denormalised columns are correct
-- regardless of which schema this database started from.
UPDATE public.faculty f
SET rating_count    = s.n,
    avg_overall     = s.overall,
    avg_teaching    = s.teaching,
    avg_grading     = s.grading,
    avg_helpfulness = s.helpfulness
FROM (
  SELECT
    fac.id,
    COUNT(r.id)                                       AS n,
    COALESCE(AVG(r.overall),     0)::NUMERIC(3,2)     AS overall,
    COALESCE(AVG(r.teaching),    0)::NUMERIC(3,2)     AS teaching,
    COALESCE(AVG(r.grading),     0)::NUMERIC(3,2)     AS grading,
    COALESCE(AVG(r.helpfulness), 0)::NUMERIC(3,2)     AS helpfulness
  FROM public.faculty fac
  LEFT JOIN public.faculty_ratings r ON r.faculty_id = fac.id
  GROUP BY fac.id
) s
WHERE f.id = s.id;

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
