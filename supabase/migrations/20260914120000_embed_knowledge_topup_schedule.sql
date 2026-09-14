-- Put the embed-knowledge top-up schedule under version control, and move it
-- onto the Vault secret.
--
-- embed-knowledge-topup was created by hand in the dashboard; no migration
-- defined it, although admin_health_metrics() and several projector comments
-- depend on it ("the embedding follows within ten minutes"). embed-knowledge
-- also accepted a hardcoded x-cron-secret literal as a fallback. The GitHub
-- repo is public, so that literal let anyone trigger embedding runs and spend
-- the Gemini quota. The function no longer accepts it, so this job must send
-- the real CRON_SECRET, which lives in Vault as sync_faculty_cron_secret (the
-- same secret every other scheduled function here uses).
--
-- APPLY ORDER: run this migration BEFORE deploying the embed-knowledge version
-- without the literal. Applied the other way round, a job still sending the
-- old literal gets 401 on every tick and new content stops being embedded
-- until this runs. Either order recovers once both are live, because the job
-- is a top-up of rows where embedding IS NULL.
--
-- Unlike the other schedule migrations this one is created active: the
-- function it calls is already deployed and has been running on this schedule.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'embed-knowledge-topup') then
    perform cron.unschedule('embed-knowledge-topup');
  end if;

  perform cron.schedule(
    'embed-knowledge-topup',
    '*/10 * * * *',
    $cmd$
    SELECT net.http_post(
      url     := 'https://ruapdkrgcbqrhvsayvpf.supabase.co/functions/v1/embed-knowledge',
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
