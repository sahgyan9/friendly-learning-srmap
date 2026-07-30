-- College ID as the verification handle, and graduation year as the trigger for
-- the alumni transition.
--
-- The SRM AP enrollment number (e.g. AP23111260062) is "AP" followed by 11
-- digits, where digits 3-4 are the enrollment year: AP23... enrolled in 2023.
-- That makes it three useful things at once: proof the person is a real student,
-- a natural one-account-per-person key, and a cross-check on any graduation year
-- they claim.
--
-- Placement matters here. public.mentors is world-readable ("Anyone can view
-- mentor profiles" USING true), so the enrollment number must not live there --
-- it is semi-private and directly identifies a student in university systems.
-- public.users and public.mentor_verifications are both restricted to the owning
-- user plus admins, so the ID lives there. Only the cohort year is published.

-- ---------------------------------------------------------------------------
-- 1. Private columns: the ID itself and the derived graduation year.
-- ---------------------------------------------------------------------------

alter table public.users
  add column if not exists college_id text,
  add column if not exists graduation_year smallint;

alter table public.mentor_verifications
  add column if not exists college_id text;

-- One enrollment number, one account. Partial so existing NULL rows are exempt.
create unique index if not exists users_college_id_key
  on public.users (college_id)
  where college_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_college_id_format'
  ) then
    alter table public.users
      add constraint users_college_id_format
      check (college_id is null or college_id ~ '^AP[0-9]{11}$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'mentor_verifications_college_id_format'
  ) then
    alter table public.mentor_verifications
      add constraint mentor_verifications_college_id_format
      check (college_id is null or college_id ~ '^AP[0-9]{11}$');
  end if;

  -- Wide enough for alumni going back a decade and students enrolling now,
  -- narrow enough to catch a typo like 227 or 20227.
  if not exists (
    select 1 from pg_constraint where conname = 'users_graduation_year_range'
  ) then
    alter table public.users
      add constraint users_graduation_year_range
      check (graduation_year is null or graduation_year between 2015 and 2040);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Public column: the cohort, which is safe to show on a mentor card.
-- ---------------------------------------------------------------------------

alter table public.mentors
  add column if not exists graduation_year smallint;

comment on column public.users.college_id is
  'SRM AP enrollment number, AP + 11 digits. Digits 3-4 are the enrollment year. Never expose in a public table.';
comment on column public.users.graduation_year is
  'Expected or actual graduation year. Drives the prompt to convert to an alumni mentor.';
comment on column public.mentors.graduation_year is
  'Cohort year for public display ("Class of 2027"). Mirrors public.users.graduation_year.';

-- ---------------------------------------------------------------------------
-- 3. Stop creating a mentor row for every new account.
-- ---------------------------------------------------------------------------
-- handle_new_user inserted into public.mentors on every signup, so all 25
-- accounts became mentor rows with department 'General' and nothing else.
-- Those rows were only invisible because getMentors() filters
-- .neq('department', 'General') -- a sentinel value standing in for a real
-- "is this profile published" flag.
--
-- A mentor row should be created when someone applies to mentor, which
-- auto_approve_mentor_application already does via INSERT ... ON CONFLICT.
-- Nothing reads the current user's mentor row unless their role is 'mentor'
-- (AuthContext uses maybeSingle; UserProfile guards on role), so dropping the
-- insert is safe.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      new.email
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
    );

  return new;
end;
$$;
