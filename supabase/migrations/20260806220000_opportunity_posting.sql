-- =============================================================================
-- Opportunity posting — make the table safe for students to write to directly
--
-- The RLS already allowed any signed-in student to INSERT (auth.uid() =
-- posted_by). Nothing used it, because rows were being written by hand in SQL
-- and a careful author covers by habit what a form has to cover by design.
-- Three gaps had to close before a real form could exist:
--
--   1. `slug` is NOT NULL UNIQUE with no default and no trigger. A client would
--      have had to invent it, and two students posting "Smart India Hackathon
--      2026" would collide on the unique index and see a raw Postgres error.
--   2. Nothing ever called rebuild_knowledge_chunks(). The projector comment
--      says "the schedule already calls" it — it does not; cron.job has an
--      embed-knowledge top-up and no rebuild. A posted opportunity got no chunk,
--      so it was never embedded and never searchable. It only worked so far
--      because the rebuild was run by hand after each manual insert.
--   3. No rate limit. A publicly indexable page that any account can append to
--      is a spam surface, and the moderation answer cannot be "Gyan notices".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Server-derived slug
--
-- Same shape as communities_set_slug, deliberately: the client should never
-- send a slug, and the uniqueness suffix has to be decided where the constraint
-- lives. Retitling keeps the original slug so links already shared do not rot.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.opportunities_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base TEXT;
  v_slug TEXT;
  v_n    INT := 1;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.title = OLD.title THEN
    NEW.slug := OLD.slug;
    RETURN NEW;
  END IF;

  v_base := public.slugify(NEW.title);
  IF v_base = '' THEN v_base := 'opportunity'; END IF;

  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM public.opportunities o WHERE o.slug = v_slug AND o.id <> NEW.id) LOOP
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  END LOOP;

  NEW.slug := v_slug;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opportunities_set_slug ON public.opportunities;
CREATE TRIGGER trg_opportunities_set_slug
  BEFORE INSERT OR UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.opportunities_set_slug();

-- -----------------------------------------------------------------------------
-- 2. Project into the search index on write
--
-- Statement-level, not per row: rebuild_opportunity_chunks() rebuilds the whole
-- (small) set anyway, so running it once per statement rather than once per row
-- is the same work and less of it. It is an upsert keyed on content_hash and
-- leaves the embedding alone when the text has not changed, so re-running it
-- costs nothing and never forces a re-embed.
--
-- The chunk lands immediately; the embedding follows within ten minutes, when
-- embed-knowledge-topup next runs. Until then the opportunity is on the page and
-- findable by keyword, just not yet by meaning.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.opportunities_reproject()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  PERFORM public.rebuild_opportunity_chunks();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_opportunities_reproject ON public.opportunities;
CREATE TRIGGER trg_opportunities_reproject
  AFTER INSERT OR UPDATE OR DELETE ON public.opportunities
  FOR EACH STATEMENT EXECUTE FUNCTION public.opportunities_reproject();

-- -----------------------------------------------------------------------------
-- 3. Rate limit
--
-- Open posting is the growth loop and worth having, but "any account may append
-- to a public, search-indexed page" needs a ceiling that is not a person
-- watching. Five a day is far above what a real student does (most will post
-- once, ever) and far below what makes spamming worthwhile.
--
-- Enforced in a trigger rather than an RLS policy on purpose: a WITH CHECK
-- subquery counting the poster's own rows would be re-evaluated per row and
-- gives a "violates row-level security" message that tells the student nothing.
-- Admins are exempt — curating a batch of listings is the expected use.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.opportunities_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recent INT;
BEGIN
  IF NEW.posted_by IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.posted_by AND is_admin = TRUE) THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.opportunities
  WHERE posted_by = NEW.posted_by
    AND created_at > now() - INTERVAL '24 hours';

  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'You have posted 5 opportunities in the last day. Try again tomorrow.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opportunities_rate_limit ON public.opportunities;
CREATE TRIGGER trg_opportunities_rate_limit
  BEFORE INSERT ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.opportunities_rate_limit();

-- -----------------------------------------------------------------------------
-- 4. Actually schedule the rebuild
--
-- The trigger above covers opportunities. Faculty and mentor chunks still go
-- stale silently — a mentor updating their skills changed nothing in search
-- until someone remembered to run this by hand. Hourly, off the hour so it does
-- not contend with the embed top-up on the 10-minute boundary.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('rebuild-knowledge-chunks-hourly')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rebuild-knowledge-chunks-hourly');

    PERFORM cron.schedule(
      'rebuild-knowledge-chunks-hourly',
      '7 * * * *',
      $cron$ SELECT public.rebuild_knowledge_chunks(); $cron$
    );
  END IF;
END;
$$;

-- These are triggers and internal helpers, not an API. New functions are
-- exposed to anon/authenticated by default here, and revoking from PUBLIC alone
-- does not undo Supabase's separate default grants.
REVOKE ALL ON FUNCTION public.opportunities_set_slug()    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.opportunities_reproject()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.opportunities_rate_limit()  FROM PUBLIC, anon, authenticated;
