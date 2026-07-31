-- Automatically grab and preserve Google profile avatar image on user signup / login
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
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      excluded.name,
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

-- Sync existing profile_image from users table to mentors table for existing mentors with missing images
update public.mentors m
set profile_image = u.profile_image
from public.users u
where m.id = u.id
  and (m.profile_image is null or m.profile_image = '')
  and (u.profile_image is not null and u.profile_image != '');

