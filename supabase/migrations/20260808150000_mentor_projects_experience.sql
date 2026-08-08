-- Real, mentor-authored project and experience entries, replacing what was
-- previously fabricated client-side in getEnhancedMentorProfile() whenever a
-- mentor's row had none. Writes already go through updateMentorFields(),
-- which the owner-only UPDATE policy on `mentors` already covers.
--
-- `authenticated` has table-level SELECT on `mentors`, so it picks up new
-- columns automatically. `anon` does not — it was deliberately cut back to
-- column-level SELECT grants (withholding `mobile`/`cgpa`) in an earlier
-- migration, and column-level grants do NOT extend to columns added later.
-- A first version of this migration skipped the explicit grant below on the
-- mistaken belief that `mentors` used table-level grants throughout; it
-- shipped for a few minutes and 42501'd every signed-out read of the mentor
-- directory before being caught and fixed. The check that would have caught
-- it in review:
--   SELECT grantee, column_name FROM information_schema.column_privileges
--   WHERE table_schema='public' AND table_name='mentors' AND privilege_type='SELECT';
-- (run as its own statement — batching it with another query in the same
-- call is what hid the column-level rows the first time.)

alter table public.mentors
  add column if not exists projects jsonb not null default '[]'::jsonb,
  add column if not exists experiences jsonb not null default '[]'::jsonb;

grant select (projects, experiences) on public.mentors to anon;

-- A profile is a highlight reel, not an archive — bounding the list keeps the
-- card grid it renders into from growing unbounded, and keeps the row small.
alter table public.mentors
  add constraint mentors_projects_limit check (jsonb_array_length(projects) <= 6);
alter table public.mentors
  add constraint mentors_experiences_limit check (jsonb_array_length(experiences) <= 6);
