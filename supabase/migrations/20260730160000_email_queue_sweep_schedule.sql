-- Schedule the email queue sweep.
--
-- Created inactive on purpose. The send-email-queue function must be deployed
-- first, or every tick posts to a URL that 404s and fills the cron log with
-- failures that look like a bug in the queue.
--
-- To enable, once the function is deployed:
--   select cron.alter_job(
--     (select jobid from cron.job where jobname = 'send-email-queue-sweep'),
--     active := true);
--
-- Note cron.job cannot be UPDATEd directly on Supabase (permission denied for
-- table job); cron.alter_job is the supported way to toggle a schedule.
--
-- Five minutes, not one: the function itself holds messages for a three-minute
-- quiet period so a rapid exchange becomes one email instead of ten, and
-- sweeping more often than that just wakes the function up to find nothing ripe.
--
-- Reuses the same vault secret as sync-faculty, because both functions read the
-- same CRON_SECRET environment variable.

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'send-email-queue-sweep') then
    perform cron.schedule(
      'send-email-queue-sweep',
      '*/5 * * * *',
      $cmd$
      SELECT net.http_post(
        url     := 'https://ruapdkrgcbqrhvsayvpf.supabase.co/functions/v1/send-email-queue',
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
    (select jobid from cron.job where jobname = 'send-email-queue-sweep'),
    active := false
  );
end $$;
