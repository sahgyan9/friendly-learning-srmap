-- Opt-in "Courses Taken" list for public mentor profiles (code + name only —
-- no grades, credits, CGPA, or semester) so students can search/discover
-- mentors by coursework on the profile page itself. Deliberately separate
-- from "Apply to Profile" (program/CGPA) — a mentor can expose one without
-- the other. Note: semantic search already folds subject names from
-- academic_imports into every mentor's index unconditionally
-- (rebuild_mentor_chunks(), 20260808160000_academic_imports.sql) — this
-- column only controls what's rendered on the public profile page, it does
-- not change search indexing.
--
-- `authenticated` already has table-level SELECT on `mentors`. `anon` only
-- has column-level grants and they do NOT auto-extend to new columns —
-- skipping the grant below 42501s every signed-out profile/directory read,
-- exactly as already happened once with `projects`/`experiences`
-- (20260808150000_mentor_projects_experience.sql). Verify after applying,
-- as its own standalone call (batching hid the missing row last time):
--   SELECT grantee, column_name FROM information_schema.column_privileges
--   WHERE table_schema='public' AND table_name='mentors' AND privilege_type='SELECT';

alter table public.mentors
  add column if not exists courses jsonb not null default '[]'::jsonb;

grant select (courses) on public.mentors to anon;

-- Unlike projects/experiences (a curated 6-item highlight reel), this list
-- exists for search/discovery ("who's taken X"), so it should hold a near-
-- full transcript, not a curated few. Cap generously against abuse rather
-- than curating: a 4-year program runs ~50-60 courses.
alter table public.mentors
  add constraint mentors_courses_limit check (jsonb_array_length(courses) <= 80);
