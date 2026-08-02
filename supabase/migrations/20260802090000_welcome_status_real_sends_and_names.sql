-- Two bugs on the admin Welcome emails page, both in this one function.
--
-- 1. Every mentor was called "A mentor".
--    The deployed function returned only (user_id, email, sent_at, welcomed) —
--    an earlier draft of migration 20260731150000, which the repo has since
--    moved past but the database never received. The client falls back to
--    "A mentor" when name is absent, so the greeting came out as "Hi A," and the
--    admin had to type the real name into every draft by hand.
--
-- 2. "Welcomed" appeared against people nobody had written to.
--    email_queue.sent_at does not mean "an email went out". It means "this row
--    is settled", and the sweeper settles rows it decides NOT to send: it
--    stamps sent_at and records why in last_error ("already read on site",
--    "recipient opted out or has no email", "expired unsent"). Reading sent_at
--    alone turned every suppression into a delivered welcome.
--
--    Concretely: the deployed send-email-queue predates the welcome_mentor
--    branch, so ankush adhikari's welcome row fell through the message path,
--    found no messages to summarise, concluded "already read on site" and
--    settled itself. Nothing was sent; the page said Welcomed.
--
-- The rule from here: a welcome counts only when the row is settled AND carries
-- no error. That is true on both routes — Resend clears last_error on a real
-- send, and the admin's manual mark inserts with none.
--
-- Dropped rather than replaced: the return type gains four columns, and
-- CREATE OR REPLACE cannot widen a table-returning signature.

drop function if exists public.admin_list_mentor_welcome_status();

create function public.admin_list_mentor_welcome_status()
returns table (
  user_id uuid,
  name text,
  email text,
  profile_image text,
  department text,
  approved_at timestamptz,
  sent_at timestamptz,
  welcomed boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'Only an admin can read welcome status';
  end if;

  return query
  select
    v.user_id,
    -- Three sources because all three go stale differently: the mentors row is
    -- the name they chose, the users row is the account, and the application
    -- blob is the only one that survives if the first two were never filled in.
    coalesce(
      nullif(btrim(m.name), ''),
      nullif(btrim(u.name), ''),
      nullif(btrim(v.application_data->>'name'), '')
    ) as name,
    u.email,
    coalesce(nullif(btrim(m.profile_image), ''), nullif(btrim(u.profile_image), '')) as profile_image,
    coalesce(nullif(btrim(m.department), ''), nullif(btrim(u.department), '')) as department,
    -- reviewed_at is null on the auto-approve path, which is now every
    -- application, so submission time is the only date that reliably exists.
    coalesce(v.reviewed_at, v.submitted_at) as approved_at,
    -- Only hand back a timestamp for a send that happened. Returning the settle
    -- time of a suppressed row would print "Welcomed 31 July" under a mentor
    -- who was never written to.
    case when q.last_error is null then q.sent_at end as sent_at,
    (q.sent_at is not null and q.last_error is null) as welcomed
  from public.mentor_verifications v
  join public.users u on u.id = v.user_id
  left join public.mentors m on m.id = v.user_id
  left join public.email_queue q
    on q.recipient_id = v.user_id and q.kind = 'welcome_mentor'
  where v.status = 'approved'
  order by (q.sent_at is not null and q.last_error is null),
           coalesce(v.reviewed_at, v.submitted_at) desc;
end;
$$;

comment on function public.admin_list_mentor_welcome_status() is
  'Approved mentors with name, email and whether a welcome was actually sent. A queue row settled with an error does not count as sent. Admin only.';

/**
 * Records that a mentor has been welcomed.
 *
 * Still idempotent, and still refuses to move a sent_at that represents a real
 * send. But a row the sweeper suppressed is not a real send, so when last_error
 * is set the timestamp is replaced rather than kept — otherwise marking Ankush
 * welcomed today would file it under the moment the queue gave up on him, and
 * the leftover error would keep him reading as unwelcomed forever.
 */
create or replace function public.admin_mark_mentor_welcomed(p_mentor_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sent_at timestamptz;
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'Only an admin can record a welcome';
  end if;

  if not exists (select 1 from auth.users where id = p_mentor_id) then
    raise exception 'No such user';
  end if;

  insert into public.email_queue (recipient_id, kind, sent_at)
  values (p_mentor_id, 'welcome_mentor', now())
  on conflict (recipient_id) where kind = 'welcome_mentor'
  do update set
    sent_at = case
                when public.email_queue.last_error is null
                  then coalesce(public.email_queue.sent_at, now())
                else now()
              end,
    last_error = null
  returning sent_at into v_sent_at;

  return v_sent_at;
end;
$$;

comment on function public.admin_mark_mentor_welcomed(uuid) is
  'Marks a mentor welcomed by hand. Clears a suppressed queue row so it stops masquerading as a send.';

revoke all on function public.admin_list_mentor_welcome_status() from public, anon;
revoke all on function public.admin_mark_mentor_welcomed(uuid) from public, anon;
grant execute on function public.admin_list_mentor_welcome_status() to authenticated;
grant execute on function public.admin_mark_mentor_welcomed(uuid) to authenticated;
