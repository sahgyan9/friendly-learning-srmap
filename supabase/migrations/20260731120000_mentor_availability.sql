-- Mentor availability: a real switch, plus the ability to step away for a while.
--
-- The "Available for Connections" dropdown on /profile has been writing
-- public.users.is_available since June 2025 and nothing has ever read it. The
-- mentor grid reads public.mentors, which had no availability column at all, so
-- the control has been decorative for its whole life: a mentor who set it to
-- "No" stayed listed, kept getting Connect requests, and had no way to tell the
-- setting was doing nothing.
--
-- Availability lives on `mentors` because that is the table the grid reads. The
-- `users` copy is kept in sync by the app the same way name and bio already are,
-- so anything still reading the old column keeps working.
--
-- Two columns rather than one, because "I am away" and "I am away until Friday"
-- are different promises and collapsing them loses the deadline:
--
--   is_available = true                      -> listed
--   is_available = false, available_from null -> hidden until they say otherwise
--   is_available = false, available_from set  -> hidden until that moment passes
--
-- Hiding is a courtesy, not a privacy boundary. A hidden mentor keeps their
-- profile URL and anyone holding the link can still open it — what stops is
-- being surfaced in the grid and being invited to start new conversations.
-- Existing conversations are untouched; disappearing mid-thread would be worse
-- for the student than a mentor who is slow to reply.

alter table public.mentors
  add column if not exists is_available boolean not null default true,
  add column if not exists available_from timestamptz,
  add column if not exists availability_note text;

-- Short enough to sit on a card without a layout fight, long enough for
-- "Back after end-sems, 15 Dec".
alter table public.mentors
  drop constraint if exists mentors_availability_note_length;
alter table public.mentors
  add constraint mentors_availability_note_length
  check (availability_note is null or char_length(btrim(availability_note)) <= 120);

comment on column public.mentors.is_available is
  'False hides the mentor from the directory and disables Connect. Their profile URL still resolves.';
comment on column public.mentors.available_from is
  'When a pause ends. Null with is_available false means paused until the mentor turns it back on.';
comment on column public.mentors.availability_note is
  'Optional one-liner shown while paused, e.g. "Back after end-sems".';

-- The grid asks for "listed mentors" on every page load and that is the only
-- shape this needs to be fast for.
create index if not exists mentors_available_idx
  on public.mentors (is_available, available_from);

-- ---------------------------------------------------------------------------
-- Carry over whatever the old control managed to record
-- ---------------------------------------------------------------------------
-- Anyone who set themselves to "not available" on /profile meant it, even
-- though nothing acted on it. Honour that now rather than silently relisting
-- them the moment this ships.

update public.mentors m
   set is_available = false
  from public.users u
 where u.id = m.id
   and u.is_available is false
   and m.is_available is true;

-- ---------------------------------------------------------------------------
-- Expiry
-- ---------------------------------------------------------------------------
-- A pause with a deadline has to end on its own, or "1 day" quietly means
-- "until you remember". Two mechanisms on purpose, and they are not redundant:
--
--   * The read filter treats a past available_from as available, so a pause
--     ends the instant it is due no matter when the job last ran.
--   * The job normalises the row afterwards, so the mentor's own toggle reads
--     "Available" instead of "Paused until <a date in the past>".
--
-- Without the filter the mentor waits up to a quarter of an hour to come back;
-- without the job their settings page lies to them.

create or replace function public.mentor_is_listed(
  p_is_available boolean,
  p_available_from timestamptz
)
returns boolean
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$
  select coalesce(p_is_available, true)
      or (p_available_from is not null and p_available_from <= now());
$$;

comment on function public.mentor_is_listed(boolean, timestamptz) is
  'Single definition of "should this mentor appear in the directory". Kept immutable so it can be used in a query; now() is evaluated per call.';

create or replace function public.resume_expired_mentor_availability()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  update public.mentors
     set is_available = true,
         available_from = null,
         availability_note = null
   where is_available = false
     and available_from is not null
     and available_from <= now();

  get diagnostics v_count = row_count;

  -- Keep the legacy mirror honest for anything still reading it.
  update public.users u
     set is_available = m.is_available
    from public.mentors m
   where m.id = u.id
     and u.is_available is distinct from m.is_available;

  return v_count;
end;
$$;

comment on function public.resume_expired_mentor_availability() is
  'Relists mentors whose pause has run out. Scheduled quarter-hourly; the read filter already covers the gap between runs.';

revoke all on function public.resume_expired_mentor_availability() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'resume-mentor-availability') then
    perform cron.schedule(
      'resume-mentor-availability',
      '*/15 * * * *',
      $cmd$ SELECT public.resume_expired_mentor_availability(); $cmd$
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Setting it
-- ---------------------------------------------------------------------------
-- A single entry point instead of letting the client write the three columns
-- itself, so "pause for 7 days" cannot become is_available = false with a
-- forgotten available_from, which is an accidental permanent disappearance.

create or replace function public.set_mentor_availability(
  p_available boolean,
  p_days integer default null,
  p_note text default null
)
returns table (is_available boolean, available_from timestamptz, availability_note text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_from timestamptz;
  v_note text;
begin
  if v_user is null then
    raise exception 'You need to be signed in' using errcode = '28000';
  end if;

  if not exists (select 1 from public.mentors m where m.id = v_user) then
    raise exception 'No mentor profile to update' using errcode = 'P0002';
  end if;

  if p_available then
    -- Coming back clears the whole pause, including a note that would
    -- otherwise keep telling students you are away.
    v_from := null;
    v_note := null;
  else
    if p_days is not null then
      if p_days < 1 or p_days > 365 then
        raise exception 'A pause has to be between 1 and 365 days' using errcode = '22023';
      end if;
      v_from := now() + make_interval(days => p_days);
    else
      v_from := null;  -- paused until they come back on their own
    end if;

    v_note := nullif(btrim(coalesce(p_note, '')), '');
    if char_length(v_note) > 120 then
      v_note := left(v_note, 120);
    end if;
  end if;

  update public.mentors m
     set is_available = p_available,
         available_from = v_from,
         availability_note = v_note
   where m.id = v_user;

  update public.users u
     set is_available = p_available
   where u.id = v_user;

  return query
    select m.is_available, m.available_from, m.availability_note
      from public.mentors m
     where m.id = v_user;
end;
$$;

comment on function public.set_mentor_availability(boolean, integer, text) is
  'Pause or resume your own mentor listing. p_days null while pausing means indefinitely.';

revoke all on function public.set_mentor_availability(boolean, integer, text) from public, anon;
grant execute on function public.set_mentor_availability(boolean, integer, text) to authenticated;
