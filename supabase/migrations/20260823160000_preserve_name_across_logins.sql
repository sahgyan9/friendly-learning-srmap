-- handle_new_user() (20260731100000_google_profile_image.sql) fires AFTER
-- INSERT OR UPDATE on auth.users, on purpose, so an account's Google avatar
-- and name can be picked up on every login, not just at signup. But its
-- upsert treated `name` and `profile_image` inconsistently: profile_image
-- is coalesce(existing value, new Google value, ...) -- it never overwrites
-- something already saved. `name` did the opposite -- it always preferred
-- the fresh Google metadata first. On a later login, whatever display name
-- is on that Google account (which can be a nickname, e.g. a mentor whose
-- Google profile says "Jimmy" while their real name on file is "Saksham
-- Kumar Sah") silently replaced the name already in public.users. It did
-- not touch public.mentors, which is a separate copy the mentor grid and
-- profile pages read (see MENTOR_ONLY_FIELDS comment in
-- src/integrations/supabase/services/mentors.ts) -- so the directory kept
-- the correct name while chat, which reads public.users, showed the
-- Google nickname instead.
--
-- Fix: match the profile_image pattern. Once a name is on file, a login
-- can no longer overwrite it -- only fill it in if it was ever empty.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, profile_image, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      new.email
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    'student'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(
      nullif(public.users.name, ''),
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      new.email
    ),
    profile_image = coalesce(
      public.users.profile_image,
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    );

  return new;
end;
$$;

-- One-time fix for the mentor this was reported for: public.mentors.name
-- ("Saksham Kumar Sah") is the name actually shown on his directory listing
-- and profile; public.users.name had drifted to his Google account's
-- display name ("Jimmy Sah") after a later login. Re-sync the users copy
-- to match what the app already shows everywhere else.
update public.users u
set name = m.name
from public.mentors m
where u.id = m.id
  and m.name = 'Saksham Kumar Sah'
  and u.name is distinct from m.name;

-- Note on test coverage: 20260731100000_google_profile_image.sql, which this
-- migration replaces the function from, was itself never added to
-- supabase/tests/verify-migrations.mjs -- it's listed there under "OUT OF
-- SCOPE FOR THIS PASS" because exercising it needs an auth.users stub the
-- harness doesn't have yet. This migration was verified directly against
-- production instead (see chat history / commit message), following the
-- same fallback the project rules call for when the harness can't reach a
-- migration.
