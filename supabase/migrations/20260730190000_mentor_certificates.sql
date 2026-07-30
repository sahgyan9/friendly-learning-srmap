-- Mentor certificates, earned rather than granted.
--
-- The point of a certificate is that it says something a student could not have
-- said about themselves. So this one is not issued on signup: it is issued once
-- someone has actually helped people, and every figure printed on it is counted
-- from the database at the moment it is read.
--
-- Two consequences follow, and both are deliberate:
--
--   * The mentor application page shows a *sample* certificate, clearly labelled,
--     next to the bar you have to clear. Showing a real-looking certificate to
--     someone who has done nothing yet is the same broken promise as the
--     "we'll email you once it's reviewed" copy this repo just removed.
--   * Every certificate carries a public verification URL. Without one it is a
--     picture, and a picture can be edited in a browser in thirty seconds. The
--     URL is what makes it worth putting on LinkedIn.
--
-- Nothing here is styled or worded as an SRM AP credential. Friendly Learning is
-- a student-run platform and says so on the certificate; a student project
-- issuing something that resembles a university document would be a real
-- problem, not a cosmetic one.

-- ---------------------------------------------------------------------------
-- The bar.
-- ---------------------------------------------------------------------------
-- Three students, each of whom replied. Low enough to be reachable in a first
-- semester, high enough that it cannot be cleared by accident. Changing it means
-- changing MIN_STUDENTS_FOR_CERTIFICATE in src/lib/certificate.ts too.

create table if not exists public.certificates (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references public.users(id) on delete cascade,
  certificate_number text not null unique,
  issued_at          timestamptz not null default now(),
  -- Set by an admin if a certificate turns out to have been earned dishonestly.
  -- Verification then reports it as revoked rather than 404ing, so a shared link
  -- tells the truth instead of looking merely broken.
  revoked_at         timestamptz,
  revoked_reason     text
);

comment on table public.certificates is
  'One per mentor, issued when the impact threshold is first met. The figures are not stored here -- they are recomputed on read so the certificate cannot go stale or be edited.';

create sequence if not exists public.certificate_number_seq;

alter table public.certificates enable row level security;

-- Owners may read their own row. Everyone else goes through get_certificate(),
-- which returns a curated set of columns; a blanket public select policy here
-- would expose user_id, and from there a join to everything else.
drop policy if exists "Users read their own certificate" on public.certificates;
create policy "Users read their own certificate"
  on public.certificates for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies: issuing goes through the SECURITY DEFINER
-- function below, so nobody can grant themselves one.

-- ---------------------------------------------------------------------------
-- What the certificate counts.
-- ---------------------------------------------------------------------------
-- "Students helped" is the number of distinct people who had a real exchange
-- with this mentor -- the mentor sent at least one message and the student sent
-- at least one back. Counting conversations instead would let anyone inflate the
-- figure by opening chats and never being answered, which is exactly the number
-- a certificate must not be able to claim.

create or replace function public.mentor_impact(p_user_id uuid)
returns table (
  students_helped int,
  badges          int,
  reviews         int,
  average_rating  numeric,
  mentor_since    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      select count(distinct case when c.user1_id = p_user_id then c.user2_id else c.user1_id end)::int
        from public.conversations c
       where (c.user1_id = p_user_id or c.user2_id = p_user_id)
         and c.user1_id <> c.user2_id
         and exists (
           select 1 from public.messages m
            where m.conversation_id = c.id and m.sender_id = p_user_id
         )
         and exists (
           select 1 from public.messages m
            where m.conversation_id = c.id and m.sender_id <> p_user_id
         )
    ),
    (select count(*)::int from public.user_badges b where b.user_id = p_user_id),
    (select count(*)::int from public.mentor_reviews r where r.mentor_id = p_user_id),
    (select round(avg(r.rating)::numeric, 1) from public.mentor_reviews r where r.mentor_id = p_user_id),
    (select m.created_at from public.mentors m where m.id = p_user_id);
$$;

comment on function public.mentor_impact(uuid) is
  'Aggregate counts only, no message content. Safe to expose: the same figures are printed on the public certificate.';

-- ---------------------------------------------------------------------------
-- Issuing.
-- ---------------------------------------------------------------------------
-- Takes no user id and acts only on auth.uid(), so it cannot be used to issue a
-- certificate to somebody else. Idempotent: calling it repeatedly returns the
-- certificate already held.

create or replace function public.issue_certificate_if_earned()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing uuid;
  v_students int;
  v_id uuid;
  v_number text;
begin
  if v_user_id is null then
    raise exception 'Not signed in';
  end if;

  select id into v_existing from public.certificates where user_id = v_user_id;
  if v_existing is not null then
    return v_existing;
  end if;

  -- Mentors only. A student who has swapped messages with three mentors has
  -- been helped, not helped others.
  if not exists (select 1 from public.mentors where id = v_user_id) then
    return null;
  end if;

  select students_helped into v_students from public.mentor_impact(v_user_id);

  if coalesce(v_students, 0) < 3 then
    return null;
  end if;

  v_number := 'FL-' || to_char(now(), 'YYYY') || '-'
              || lpad(nextval('public.certificate_number_seq')::text, 4, '0');

  insert into public.certificates (user_id, certificate_number)
  values (v_user_id, v_number)
  returning id into v_id;

  insert into public.notifications (user_id, type, title, content)
  values (
    v_user_id, 'system',
    'You have earned your mentor certificate 🎓',
    'Three students have been helped by you. Your certificate is ready to view, download and share.'
  );

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Verification.
-- ---------------------------------------------------------------------------
-- Deliberately public and unauthenticated: a certificate nobody can check is
-- worth nothing. Returns only what already appears on the certificate itself --
-- no email, no College ID, no mobile, no CGPA.
--
-- An unknown id returns no rows rather than an error, and the page says the same
-- thing either way, so this cannot be used to probe which ids exist.

create or replace function public.get_certificate(p_certificate_id uuid)
returns table (
  certificate_number text,
  issued_at          timestamptz,
  revoked            boolean,
  name               text,
  department         text,
  university         text,
  is_alumni          boolean,
  graduation_year    smallint,
  students_helped    int,
  badges             int,
  reviews            int,
  average_rating     numeric,
  mentor_since       timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.certificate_number,
    c.issued_at,
    c.revoked_at is not null,
    m.name,
    m.department,
    m.university,
    m.is_alumni,
    m.graduation_year,
    i.students_helped,
    i.badges,
    i.reviews,
    i.average_rating,
    i.mentor_since
  from public.certificates c
  join public.mentors m on m.id = c.user_id
  cross join lateral public.mentor_impact(c.user_id) i
  where c.id = p_certificate_id;
$$;

-- The owner's own view, including progress when nothing has been earned yet.
create or replace function public.my_certificate_status()
returns table (
  certificate_id     uuid,
  certificate_number text,
  issued_at          timestamptz,
  revoked            boolean,
  is_mentor          boolean,
  students_helped    int,
  students_required  int,
  badges             int,
  reviews            int,
  average_rating     numeric,
  mentor_since       timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.certificate_number,
    c.issued_at,
    c.revoked_at is not null,
    exists (select 1 from public.mentors m where m.id = auth.uid()),
    i.students_helped,
    3,
    i.badges,
    i.reviews,
    i.average_rating,
    i.mentor_since
  from public.mentor_impact(auth.uid()) i
  left join public.certificates c on c.user_id = auth.uid()
  where auth.uid() is not null;
$$;

revoke all on function public.issue_certificate_if_earned() from public, anon;
grant execute on function public.issue_certificate_if_earned() to authenticated;
grant execute on function public.my_certificate_status() to authenticated;
grant execute on function public.get_certificate(uuid) to anon, authenticated;
grant execute on function public.mentor_impact(uuid) to authenticated;
