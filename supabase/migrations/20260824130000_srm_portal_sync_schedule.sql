-- Refresh a small, rotating batch of linked mentors' SRM academic data
-- (CGPA, semester, coursework, mobile) via unattended login -- OCR-only
-- captcha, no human confirmation. See srm_portal_credentials' table comment
-- for the accepted-risk rationale.
--
-- Deliberately infrequent and small-batch: CGPA and semester realistically
-- change about twice a year and mobile numbers rarely at all, so there is no
-- benefit to checking more than once a day -- every unnecessary check is an
-- unnecessary unattended login against a system whose lockout policy is
-- unknown. sync-srm-portal selects ORDER BY last_attempt_at NULLS FIRST
-- LIMIT 25 each run, so the whole linked-mentor population cycles through on
-- its own without ever bursting.
--
-- 21:30 UTC = 03:00 IST -- mentors asleep, same "overnight cache job nobody
-- reads" slot as sync-srmap-events-daily, chosen so a same-second collision
-- with the mentor's own manual portal use (which would look like two
-- concurrent sessions) is minimized.
--
-- Reuses the same vault secret as every other cron-invoked function here --
-- CRON_SECRET is one project-wide function secret, not one per job.
--
-- Created inactive, same reason as send-email-queue-sweep: a job pointing at
-- a function that isn't deployed yet posts to a 404 on every tick. Enable
-- with, once sync-srm-portal is confirmed live:
--
--   select cron.alter_job(
--     (select jobid from cron.job where jobname = 'srm-portal-sync'),
--     active := true);

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'srm-portal-sync') then
    perform cron.schedule(
      'srm-portal-sync',
      '30 21 * * *',
      $cmd$
      SELECT net.http_post(
        url     := 'https://ruapdkrgcbqrhvsayvpf.supabase.co/functions/v1/sync-srm-portal',
        body    := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type',   'application/json',
          'x-cron-secret',  (SELECT decrypted_secret FROM vault.decrypted_secrets
                             WHERE name = 'sync_faculty_cron_secret')
        ),
        timeout_milliseconds := 120000
      );
      $cmd$
    );
  end if;

  perform cron.alter_job(
    (select jobid from cron.job where jobname = 'srm-portal-sync'),
    active := false
  );
end $$;
