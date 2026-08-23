-- =============================================================================
-- Academic refresh reminder — nudge current students to re-import their
-- transcript when a new semester's results are published.
--
-- WHY A REMINDER AND NOT AN AUTOMATIC SYNC
-- The obvious version of this feature is to refresh everyone's CGPA and
-- coursework on a schedule, with no student involvement. It was considered and
-- rejected, and the reasoning is not obvious from the code, so:
--
--   1. The SRM portal password IS the student's date of birth (DDMMYYYY) --
--      see the header of supabase/functions/import-srm-portal/index.ts. Storing
--      a DOB so we can log in later is therefore storing a live credential for
--      a system we do not run. A leak would expose their actual university
--      account -- attendance, grades, personal records -- not just their
--      Friendly Learning account. academic_imports' own table comment commits
--      to never storing it.
--   2. Every portal login needs a captcha solved, and the OCR guess is
--      advisory only BY DESIGN, because a wrong guess is a real failed login
--      against the student's real account and the portal's lockout policy is
--      unknown. A scheduled job has no human to confirm it.
--
-- So the login stays student-initiated and only the *prompt* is automated,
-- which is the part that actually makes profiles stay current. From the
-- student's side it feels handled; we never hold a credential.
--
-- Only the two dates matter: SRM AP publishes results in mid-January and late
-- June, so a nudge at any other time is asking someone to re-import data that
-- has not changed.
--
-- Students who have NEVER imported are deliberately out of scope. Nothing of
-- theirs is stale, and "you have never done this" is an onboarding message with
-- different copy and a different audience -- folding the two together would
-- make both worse.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.queue_academic_refresh_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  queued INTEGER;
BEGIN
  INSERT INTO public.email_queue (recipient_id, kind)
  SELECT ai.user_id, 'academic_refresh'
  FROM public.academic_imports ai
  JOIN public.users u ON u.id = ai.user_id
  LEFT JOIN public.mentors m ON m.id = ai.user_id
  WHERE
    -- They have imported successfully before, so there is something to refresh
    -- and we know the flow works for them.
    ai.sync_status = 'success'
    AND ai.last_synced_at IS NOT NULL
    -- Someone who synced last week does not need telling. Results have only
    -- just landed when this runs, so anything older than a month is pre-results
    -- by definition.
    AND ai.last_synced_at < now() - INTERVAL '30 days'
    -- An alumnus's coursework is finished; there is no new semester for them.
    AND COALESCE(m.is_alumni, false) IS FALSE
    -- send-email-queue re-checks this at send time and is the authority. It is
    -- repeated here only to avoid queueing rows that are certain to be dropped.
    AND COALESCE(u.email_notifications, true) IS TRUE
    -- Never twice in one results window. Also makes this function safe to run
    -- by hand, which matters because that is how it will be tested.
    AND NOT EXISTS (
      SELECT 1 FROM public.email_queue eq
      WHERE eq.recipient_id = ai.user_id
        AND eq.kind = 'academic_refresh'
        AND eq.created_at > now() - INTERVAL '60 days'
    );

  GET DIAGNOSTICS queued = ROW_COUNT;
  RETURN queued;
END;
$$;

COMMENT ON FUNCTION public.queue_academic_refresh_reminders() IS
  'Queues an academic_refresh email for current students whose transcript import predates the latest results. Enqueues only -- send-email-queue delivers. Safe to run by hand; will not re-queue anyone within 60 days.';

-- Not an API. Supabase grants EXECUTE to anon and authenticated by default on
-- new functions, so revoking from PUBLIC alone would leave it callable by any
-- visitor -- and this one writes rows that turn into email.
REVOKE ALL ON FUNCTION public.queue_academic_refresh_reminders() FROM PUBLIC, anon, authenticated;

-- The cron schedule that calls this lives in the next migration, not here, so
-- that this file (which holds all the eligibility logic worth getting wrong)
-- can run in the PGlite test harness. PGlite ships no pg_cron, and one
-- `cron.job` reference would make the whole file unrunnable and therefore
-- untested. Same split as 20260807120000_srmap_events_cache.sql and its
-- _sync_schedule sibling.
