-- Run queue_academic_refresh_reminders() on the two days SRM AP publishes
-- results: 15 January and 20 June.
--
-- 04:30 UTC = 10:00 IST. Mid-morning local time on purpose: this mail asks
-- someone to go and do a 30-second task, so it wants to arrive when they might
-- actually do it, unlike the overnight cache jobs nobody reads.
--
-- No net.http_post here, unlike every other scheduled job in this repo. This
-- one only writes rows to email_queue, and the existing send-email-queue sweep
-- (every 5 minutes) delivers them. One delivery path, not two -- which also
-- means these reminders inherit the sweeper's opt-out re-check, per-recipient
-- batching and retry handling for free.
--
-- Split out from 20260823210000_academic_refresh_reminder.sql so that the
-- function's eligibility logic stays testable: PGlite ships no pg_cron, so a
-- single `cron.job` reference in that file would make all of it unrunnable in
-- the harness. See the pgvector/pg_cron SKIP list in
-- supabase/tests/verify-migrations.mjs.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'academic-refresh-reminder-jan') THEN
    PERFORM cron.schedule(
      'academic-refresh-reminder-jan',
      '30 4 15 1 *',
      $cmd$ SELECT public.queue_academic_refresh_reminders(); $cmd$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'academic-refresh-reminder-jun') THEN
    PERFORM cron.schedule(
      'academic-refresh-reminder-jun',
      '30 4 20 6 *',
      $cmd$ SELECT public.queue_academic_refresh_reminders(); $cmd$
    );
  END IF;
END $$;
