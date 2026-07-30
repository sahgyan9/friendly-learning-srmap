-- Actually run the badge awarding.
--
-- auto_award_performance_badges() has existed since the badge system was built
-- and nothing has ever called it, so every badge on the platform would have had
-- to be awarded by hand -- and none ever were. The certificate prints a "badges
-- earned" figure, which made this the difference between a real number and a
-- permanent zero.
--
-- Plain SQL against the same database, like alumni-prompt-monthly: no edge
-- function, no secret, nothing exposed over HTTP.
--
-- Weekly rather than daily. The function's inputs are rating and review_count,
-- which move slowly, and a badge arriving on Monday instead of Sunday night
-- costs nothing. It is already idempotent -- every insert is guarded by a NOT
-- EXISTS on (user_id, badge_type_id) -- so a repeat run awards nothing twice.
--
-- Awards fire the existing badge_award_notification trigger, so recipients are
-- told without anything further here. awarded_by is left null, which is what
-- distinguishes an automatic award from one an admin gave.
--
-- Worth knowing what this will and will not do: the thresholds are rating >= 4.5
-- with 10+ reviews (Top Mentor) and rating >= 4.0 with 3-9 reviews in the
-- mentor's first three months (Rising Star). public.mentor_reviews is currently
-- empty, so this job will correctly award nothing until students start leaving
-- reviews. The job is not the blocker; reviews are.

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'award-performance-badges-weekly') then
    perform cron.schedule(
      'award-performance-badges-weekly',
      '0 5 * * 1',
      $cmd$ SELECT public.auto_award_performance_badges(); $cmd$
    );
  end if;
end $$;
