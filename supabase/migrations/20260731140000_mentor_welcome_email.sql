-- Welcome email for a newly approved mentor.
--
-- Approval already creates an in-app notification ("Welcome, Mentor! 🎉"), which
-- only lands if the person happens to come back to the site. The moment someone
-- finishes an application is the moment they are most willing to fill in a
-- profile and start a group, and it is the one moment we were not reaching them.
--
-- Enqueued rather than sent inline, reusing the queue that already exists for
-- message notifications: same retry accounting, same opt-out checks, same
-- one-click unsubscribe, and an approval that cannot fail because Resend is
-- having an afternoon.
--
-- A SEPARATE trigger rather than an edit to auto_approve_mentor_application.
-- That function is ~130 lines of application parsing, flagging and propagation,
-- and it is a BEFORE trigger whose return value decides what gets written. A
-- welcome email has no business anywhere near that; an AFTER trigger sees the
-- same row after it has settled and cannot affect the outcome.

-- ---------------------------------------------------------------------------
-- One per mentor, forever
-- ---------------------------------------------------------------------------
-- Approval can be reached twice: auto_approve_mentor_application on insert, and
-- update_verification_status when an admin approves by hand. A partial unique
-- index makes the second one a no-op instead of a second welcome, and keeps
-- that true no matter what future path also ends in 'approved'.

create unique index if not exists email_queue_one_welcome_per_mentor_idx
  on public.email_queue (recipient_id)
  where kind = 'welcome_mentor';

comment on index public.email_queue_one_welcome_per_mentor_idx is
  'A mentor is welcomed once. Covers both the auto-approve path and an admin approving by hand.';

create or replace function public.enqueue_mentor_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enabled boolean;
begin
  if new.status is distinct from 'approved' then
    return null;
  end if;

  -- On the UPDATE path, only the transition matters. Re-saving an already
  -- approved row is not a new mentor.
  if tg_op = 'UPDATE' and old.status = 'approved' then
    return null;
  end if;

  select u.email_notifications into v_enabled
    from public.users u
   where u.id = new.user_id;

  if coalesce(v_enabled, true) then
    insert into public.email_queue (recipient_id, kind)
    values (new.user_id, 'welcome_mentor')
    on conflict do nothing;   -- the index above; a second approval sends nothing
  end if;

  return null;
exception when others then
  -- Identical reasoning to notify_message_email: an approval must never fail
  -- because of email bookkeeping.
  raise warning 'Could not enqueue welcome email for mentor %: %', new.user_id, sqlerrm;
  return null;
end;
$$;

comment on function public.enqueue_mentor_welcome_email() is
  'Queues the one-time welcome email when a mentor application reaches approved, by either route.';

-- A trigger function has no business being reachable over HTTP. Postgres would
-- reject a direct call anyway ("can only be called as a trigger"), so this is
-- hygiene rather than a fix, but it costs nothing to close.
revoke all on function public.enqueue_mentor_welcome_email() from public, anon, authenticated;

drop trigger if exists on_mentor_approved_welcome_email on public.mentor_verifications;

create trigger on_mentor_approved_welcome_email
  after insert or update of status on public.mentor_verifications
  for each row
  execute function public.enqueue_mentor_welcome_email();

-- ---------------------------------------------------------------------------
-- Backfill: the mentors who were already here
-- ---------------------------------------------------------------------------
-- Deliberately NOT done automatically. Enabling this trigger and backfilling in
-- the same migration would send a "welcome, you have just been approved" email
-- to every mentor approved months ago, which is both untrue and the sort of
-- thing that gets a sending domain marked as spam.
--
-- To welcome existing mentors on purpose, as a decision rather than a side
-- effect, run:
--
--   insert into public.email_queue (recipient_id, kind)
--   select m.id, 'welcome_mentor'
--     from public.mentors m
--     join public.users u on u.id = m.id
--    where m.department is not null
--      and btrim(m.department) <> ''
--      and m.department <> 'General'
--      and coalesce(u.email_notifications, true)
--   on conflict do nothing;
--
-- The unique index makes that safe to run twice.
