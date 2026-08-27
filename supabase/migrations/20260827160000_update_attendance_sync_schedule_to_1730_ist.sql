-- Migration: 20260827160000_update_attendance_sync_schedule_to_1730_ist.sql
-- Description: Updates srm-attendance-sync-daily cron schedule to 5:30 PM IST (12:00 UTC), Monday to Friday.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'srm-attendance-sync-daily') then
    perform cron.unschedule('srm-attendance-sync-daily');
  end if;

  perform cron.schedule(
    'srm-attendance-sync-daily',
    '0 12 * * 1-5',
    $cmd$
    SELECT net.http_post(
      url     := 'https://ruapdkrgcbqrhvsayvpf.supabase.co/functions/v1/sync-srm-portal',
      body    := '{"sync_type":"attendance"}'::jsonb,
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
