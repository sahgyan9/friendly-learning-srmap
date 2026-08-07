-- Refresh the SRMAP events cache once a day.
--
-- Campus events change a few times a week at most, so daily is already
-- tighter than the source data warrants -- but it guarantees no visitor is
-- ever more than a day behind campus. 20:30 UTC = 02:00 IST: overnight for
-- the campus this data describes, so the day's first visitors always see a
-- same-morning-fresh cache instead of landing mid-refresh.
--
-- Reuses the same vault secret as sync-faculty and send-email-queue --
-- CRON_SECRET is one project-wide function secret, not one per job, and
-- sync-srmap-events checks it the same way sync-faculty does.

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'sync-srmap-events-daily') then
    perform cron.schedule(
      'sync-srmap-events-daily',
      '30 20 * * *',
      $cmd$
      SELECT net.http_post(
        url     := 'https://ruapdkrgcbqrhvsayvpf.supabase.co/functions/v1/sync-srmap-events',
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
end $$;
