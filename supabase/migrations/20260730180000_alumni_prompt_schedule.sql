-- Ask graduating mentors, monthly.
--
-- Unlike the faculty sync and the email sweep, this needs no edge function and
-- no secret: prompt_graduated_mentors() is plain SQL writing to a table in the
-- same database, so pg_cron calls it directly. Nothing is exposed over HTTP,
-- which means there is nothing here to authenticate or to leave open.
--
-- Monthly is the right cadence because the thing it watches changes once a year.
-- 04:00 on the 1st, an hour after sync-faculty, so the two never contend.
--
-- The function only ever notifies someone who has not been notified before, so a
-- missed run costs at most a month's delay and a double run costs nothing.

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'alumni-prompt-monthly') then
    perform cron.schedule(
      'alumni-prompt-monthly',
      '0 4 1 * *',
      $cmd$ SELECT public.prompt_graduated_mentors(); $cmd$
    );
  end if;
end $$;
