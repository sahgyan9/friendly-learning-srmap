-- Converting a graduating mentor into an alumni mentor.
--
-- Alumni is a state of a mentor, not a separate role -- the word "Mentor" stays,
-- because an alumnus helping with placements genuinely is mentoring.
--
-- The transition is always by consent. A mentor whose graduation year has passed
-- gets asked; nothing flips on its own. Being asked reads as a promotion, being
-- switched reads as a demotion, and the platform cannot actually know whether
-- someone graduated, deferred, or moved to a masters here.
--
-- No re-verification. The College ID does not expire: AP23 proves enrollment in
-- 2027 and still proves it in 2037. Re-checking someone already verified is
-- friction with no security gain, so confirming asks only for what changed --
-- where they work now, and optionally their role.

-- ---------------------------------------------------------------------------
-- Private state on users, public display on mentors.
-- ---------------------------------------------------------------------------

alter table public.users
  add column if not exists alumni_confirmed_at timestamptz,
  add column if not exists company text,
  add column if not exists job_title text;

comment on column public.users.alumni_confirmed_at is
  'When the person confirmed they have graduated. NULL means still a student, or asked but not yet answered.';

alter table public.mentors
  add column if not exists is_alumni boolean not null default false,
  add column if not exists company text,
  add column if not exists job_title text;

comment on column public.mentors.is_alumni is
  'Mirrors users.alumni_confirmed_at being set. Safe to publish; drives the alumni badge and filter.';

-- ---------------------------------------------------------------------------
-- Allow the new notification type.
-- ---------------------------------------------------------------------------
-- notifications.type is a CHECK-constrained set, not free text, so a new kind
-- has to be declared. Worth knowing: 'mentor_application' is branched on in
-- src/utils/notificationNavigation.ts but is not in this list and never was, so
-- that branch is unreachable -- left alone here rather than fixed blind.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['message', 'badge', 'mention', 'system', 'alumni_prompt']));

-- ---------------------------------------------------------------------------
-- Who should be asked.
-- ---------------------------------------------------------------------------
-- July, not January. SRM AP convocations run mid-year, so a "class of 2027"
-- student is still a student in February 2027 and would be baffled to be asked
-- whether they have graduated. Matches hasGraduated() in src/lib/college-id.ts.

create or replace function public.graduated_mentors_awaiting_confirmation()
returns table (user_id uuid, name text, graduation_year smallint)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.name, u.graduation_year
    from public.users u
    join public.mentors m on m.id = u.id
   where u.graduation_year is not null
     and u.alumni_confirmed_at is null
     and m.is_alumni = false
     -- 1 July of the graduation year, the same cutover the client uses.
     and now() >= make_timestamptz(u.graduation_year, 7, 1, 0, 0, 0)
$$;

comment on function public.graduated_mentors_awaiting_confirmation() is
  'Mentors whose graduation year has passed who have not yet confirmed. Read-only; the prompting job decides what to do with them.';

-- ---------------------------------------------------------------------------
-- Ask them, in-app.
-- ---------------------------------------------------------------------------
-- Deliberately not email. The people this reaches are in their final year and
-- still using the site, so the notification bell is enough -- and email cannot
-- currently be delivered at all (no verified sending domain). Email is the
-- channel for alumni who have already gone quiet, which is a later problem.

create or replace function public.prompt_graduated_mentors()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prompted int := 0;
begin
  with candidates as (
    select g.user_id, g.graduation_year
      from public.graduated_mentors_awaiting_confirmation() g
     where not exists (
       -- Ask once, then leave them alone. Re-asking every month is nagging, and
       -- someone who ignored it has effectively answered.
       select 1 from public.notifications n
        where n.user_id = g.user_id
          and n.type = 'alumni_prompt'
     )
  )
  insert into public.notifications (user_id, type, title, content, data)
  select
    c.user_id,
    'alumni_prompt',
    'Have you graduated?',
    'Your profile says you finish in ' || c.graduation_year ||
      '. Confirm and you will be listed as an alumni mentor, so students can find you for placement and career advice.',
    jsonb_build_object('graduation_year', c.graduation_year)
  from candidates c;

  get diagnostics v_prompted = row_count;
  return v_prompted;
end;
$$;

comment on function public.prompt_graduated_mentors() is
  'Notifies mentors whose graduation year has passed, once each. Returns how many were prompted. Run monthly.';

-- ---------------------------------------------------------------------------
-- Confirm.
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so one call updates users and mentors together and the two
-- cannot drift, but it acts only on auth.uid() -- there is no user id argument,
-- so it cannot be used to graduate somebody else.

create or replace function public.confirm_alumni_status(
  p_graduation_year smallint default null,
  p_company text default null,
  p_job_title text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company text := nullif(btrim(coalesce(p_company, '')), '');
  v_title text := nullif(btrim(coalesce(p_job_title, '')), '');
  v_year smallint;
begin
  if v_uid is null then
    raise exception 'Sign in to confirm your alumni status';
  end if;

  -- Correcting the year is part of confirming: the year was only ever a
  -- suggestion derived from the College ID, and this is the moment the person
  -- finally knows the answer for certain.
  if p_graduation_year is not null then
    if p_graduation_year < 2015 or p_graduation_year > 2040 then
      raise exception 'Graduation year % is out of range', p_graduation_year;
    end if;
    v_year := p_graduation_year;
  end if;

  update public.users
     set alumni_confirmed_at = now(),
         graduation_year = coalesce(v_year, graduation_year),
         company = coalesce(v_company, company),
         job_title = coalesce(v_title, job_title)
   where id = v_uid;

  update public.mentors
     set is_alumni = true,
         graduation_year = coalesce(v_year, graduation_year),
         company = coalesce(v_company, company),
         job_title = coalesce(v_title, job_title)
   where id = v_uid;

  -- Clear the prompt so the banner and the bell agree.
  update public.notifications
     set read = true
   where user_id = v_uid and type = 'alumni_prompt';
end;
$$;

revoke all on function public.confirm_alumni_status(smallint, text, text) from public, anon;
grant execute on function public.confirm_alumni_status(smallint, text, text) to authenticated;

comment on function public.confirm_alumni_status(smallint, text, text) is
  'Marks the calling user as a confirmed alumni mentor. Acts only on auth.uid(); takes no user id.';
