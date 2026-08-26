-- Update SRMAP events sync schedule from daily (30 20 * * *) to every 6 hours (30 2,8,14,20 * * *).
-- Corresponding to:
--   08:00 AM IST (morning sweep)
--   02:00 PM IST (afternoon update)
--   08:00 PM IST (evening check)
--   02:00 AM IST (nightly cleanup & pruning)

do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync-srmap-events-daily') then
    perform cron.unschedule('sync-srmap-events-daily');
  end if;

  if exists (select 1 from cron.job where jobname = 'sync-srmap-events-every-6h') then
    perform cron.unschedule('sync-srmap-events-every-6h');
  end if;

  perform cron.schedule(
    'sync-srmap-events-every-6h',
    '30 2,8,14,20 * * *',
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
end $$;
