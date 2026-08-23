-- Follow-up to 20260823160000_preserve_name_across_logins.sql, which is
-- already applied. Its one-time backfill matched on
-- m.name = 'Saksham Kumar Sah', but the mentor's real row stores the name
-- lowercase ("saksham kumar sah"), so that WHERE clause matched zero rows
-- and public.users.name was left at "Jimmy Sah". Not editing the earlier
-- file -- it already ran in production; this corrects the data by id
-- instead of by a guessed name string.
update public.users
set name = 'saksham kumar sah'
where id = '3f5a2ffd-dce9-4854-8d2d-5ae5362d1ba1'
  and name is distinct from 'saksham kumar sah';
