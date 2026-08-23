-- =============================================================================
-- Mentor dashboard — "how am I doing?" for the mentor themselves.
--
-- Everything a mentor's profile shows a visitor is already measured
-- (mentor_activity, 20260823170000). What was missing is the other half: the
-- mentor cannot see any of it in one place, and cannot see whether anyone is
-- looking at them at all. Reply rate without visibility is unreadable -- "0
-- requests" means something very different when 60 people viewed you than when
-- 2 did.
--
-- The only genuinely new measurement here is profile views. Search clicks were
-- already recorded (search_interactions, 20260823140000) but they only cover
-- people arriving from search; the directory, AI mode citations and direct
-- links were invisible.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. mentor_profile_views
--
-- Deduped to one row per viewer per mentor per day. Without that a single
-- student refreshing a profile five times would read as five people, and a
-- vanity number that inflates itself is worse than no number -- it is the same
-- failure as the "91% response rate" this whole line of work exists to undo.
--
-- viewer_id is null for signed-out visitors, who are the majority of traffic
-- and cannot be identified. The partial unique index below therefore only
-- constrains signed-in views; anonymous ones are deduped client-side per
-- browser session before they ever reach here. Imperfect, and deliberately
-- biased toward undercounting rather than over.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentor_profile_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id  UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  viewer_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  viewed_on  DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mentor_profile_views_dedupe_idx
  ON public.mentor_profile_views (mentor_id, viewer_id, viewed_on)
  WHERE viewer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mentor_profile_views_mentor_day_idx
  ON public.mentor_profile_views (mentor_id, viewed_on DESC);

-- RLS on with no policies: a mentor reads their own count through the
-- SECURITY DEFINER function below, never by selecting this table. Nothing here
-- should be able to ask who viewed whom.
ALTER TABLE public.mentor_profile_views ENABLE ROW LEVEL SECURITY;

-- Supabase's default privileges grant new tables to anon and authenticated, and
-- RLS is the only thing standing in the way. Revoke anyway: defence in depth on
-- a table whose whole point is that it is not readable.
REVOKE ALL ON TABLE public.mentor_profile_views FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.mentor_profile_views IS
  'One row per viewer per mentor per day. Never read directly -- mentor_dashboard_stats() aggregates it for the mentor themselves. Deliberately undercounts anonymous traffic rather than inflating it.';

-- -----------------------------------------------------------------------------
-- 2. log_mentor_profile_view — the deliberate public write.
--
-- Callable by anon because most profile traffic is signed out, same reasoning
-- as log_search_click. It can only ever insert a row saying "someone looked",
-- and the ON CONFLICT makes a signed-in repeat a no-op.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_mentor_profile_view(p_mentor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_mentor_id IS NULL THEN
    RETURN;
  END IF;

  -- Looking at your own profile is not visibility. Mentors check their own page
  -- more than anyone, and counting it would make the number meaningless exactly
  -- for the person reading it.
  IF auth.uid() = p_mentor_id THEN
    RETURN;
  END IF;

  -- Silently ignore a view of something that is not a mentor rather than
  -- raising: this is called from page load and must never surface an error to
  -- a visitor who did nothing wrong.
  IF NOT EXISTS (SELECT 1 FROM public.mentors WHERE id = p_mentor_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.mentor_profile_views (mentor_id, viewer_id)
  VALUES (p_mentor_id, auth.uid())
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.log_mentor_profile_view(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_mentor_profile_view(UUID) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. mentor_dashboard_stats — everything the mentor sees about themselves.
--
-- Takes no argument ON PURPOSE. An earlier draft took p_mentor_id, which makes
-- a SECURITY DEFINER function that bypasses RLS into an oracle for any mentor's
-- private numbers -- reply rate, who is being viewed, who is being ignored --
-- readable by anyone who can call an RPC. Keying off auth.uid() means the
-- question "whose stats?" has exactly one answer and no caller can change it.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mentor_dashboard_stats()
RETURNS TABLE (
  students_helped     INT,
  requests_received   INT,
  requests_answered   INT,
  median_reply_minutes INT,
  last_message_at     TIMESTAMPTZ,
  profile_views_30d   INT,
  profile_views_prev30 INT,
  search_clicks_30d   INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    a.students_helped,
    a.requests_received,
    a.requests_answered,
    a.median_reply_minutes,
    a.last_message_at,
    (SELECT count(*)::int FROM public.mentor_profile_views v
      WHERE v.mentor_id = auth.uid()
        AND v.viewed_on > (now() AT TIME ZONE 'utc')::date - 30),
    -- The 30 days before that, so the UI can say "up from 4" instead of
    -- printing a number with nothing to compare it against.
    (SELECT count(*)::int FROM public.mentor_profile_views v
      WHERE v.mentor_id = auth.uid()
        AND v.viewed_on > (now() AT TIME ZONE 'utc')::date - 60
        AND v.viewed_on <= (now() AT TIME ZONE 'utc')::date - 30),
    -- Distinct clickers, not raw clicks: the same person clicking a search
    -- result four times is one person who found you.
    (SELECT count(DISTINCT coalesce(si.viewer_id::text, si.id::text))::int
       FROM public.search_interactions si
      WHERE si.entity_type = 'mentor'
        AND si.entity_id = auth.uid()::text
        AND si.created_at > now() - INTERVAL '30 days')
  FROM public.mentor_activity(auth.uid()) a;
$$;

REVOKE ALL ON FUNCTION public.mentor_dashboard_stats() FROM PUBLIC, anon, authenticated;
-- Signed-in only. There is nothing here for anon to read -- auth.uid() is null,
-- mentor_activity returns no rows, and the whole thing is empty anyway.
GRANT EXECUTE ON FUNCTION public.mentor_dashboard_stats() TO authenticated;

COMMENT ON FUNCTION public.mentor_dashboard_stats() IS
  'The caller''s own mentor stats. Takes no argument by design: keying off auth.uid() is what stops a SECURITY DEFINER function becoming a reader of any mentor''s private numbers.';
