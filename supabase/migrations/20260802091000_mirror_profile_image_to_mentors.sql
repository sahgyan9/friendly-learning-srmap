-- A mentor's new photo showed on their own profile but not in the directory.
--
-- `users` and `mentors` each hold their own copy of profile_image. The upload on
-- /profile writes only the users row, so the mentors row kept whatever it was
-- created with — for Aarav Raj Shrestha that was an empty string, which the grid
-- renders as the placeholder. His profile page reads the users row and looked
-- correct, so the two screens disagreed about the same person.
--
-- Fixed here rather than in the upload handler because there is more than one
-- way into users.profile_image (the profile page, the OAuth sync on sign-in, and
-- anything added later), and patching one caller leaves the others broken. A
-- trigger is the only place that catches all of them.
--
-- Deliberately narrow: profile_image only. `name` diverges on purpose in at
-- least one live row (a mentor listed under a different name from their
-- account), and quietly overwriting that is not this migration's business.

create or replace function public.mirror_user_profile_image_to_mentor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mentors
     set profile_image = new.profile_image
   where id = new.id
     and profile_image is distinct from new.profile_image;

  return null;
exception when others then
  -- Never cost someone their avatar upload over a mirror that failed.
  raise warning 'Could not mirror profile image to mentors for %: %', new.id, sqlerrm;
  return null;
end;
$$;

comment on function public.mirror_user_profile_image_to_mentor() is
  'Keeps mentors.profile_image in step with users.profile_image, so the directory and the profile show the same face.';

revoke all on function public.mirror_user_profile_image_to_mentor() from public, anon, authenticated;

drop trigger if exists on_user_profile_image_changed on public.users;

create trigger on_user_profile_image_changed
  after update of profile_image on public.users
  for each row
  when (old.profile_image is distinct from new.profile_image)
  execute function public.mirror_user_profile_image_to_mentor();

-- Backfill only the mentors with nothing at all. A mentor row holding a
-- different non-empty image might be a deliberate choice; a blank one never is.
update public.mentors m
   set profile_image = u.profile_image
  from public.users u
 where u.id = m.id
   and coalesce(btrim(m.profile_image), '') = ''
   and coalesce(btrim(u.profile_image), '') <> '';
