-- Welcome email for a brand-new account, mirroring the mentor welcome email
-- added in 20260731140000_mentor_welcome_email.sql. Same reasoning: a fresher
-- who just signed up is the person most willing to look around, and an
-- in-app notification only reaches them if they come back to the site.
--
-- A trigger on public.users, not an edit to handle_new_user(). That function
-- fires AFTER INSERT OR UPDATE on auth.users -- on purpose, so it can
-- resync a Google avatar or name on every login -- and its insert into
-- public.users is an ON CONFLICT (id) DO UPDATE upsert. A row-level AFTER
-- INSERT trigger on public.users only fires for the branch of that upsert
-- that actually creates a row, so it fires exactly once per account and
-- never again on a later login.

create unique index if not exists email_queue_one_welcome_per_student_idx
  on public.email_queue (recipient_id)
  where kind = 'welcome_student';

comment on index public.email_queue_one_welcome_per_student_idx is
  'A student is welcomed once.';

create or replace function public.enqueue_student_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(new.email_notifications, true) then
    insert into public.email_queue (recipient_id, kind)
    values (new.id, 'welcome_student')
    on conflict do nothing;  -- the index above
  end if;

  return null;
exception when others then
  -- Identical reasoning to notify_message_email and
  -- enqueue_mentor_welcome_email: a signup must never fail because of email
  -- bookkeeping.
  raise warning 'Could not enqueue welcome email for user %: %', new.id, sqlerrm;
  return null;
end;
$$;

comment on function public.enqueue_student_welcome_email() is
  'Queues the one-time welcome email when a new account row is created.';

revoke all on function public.enqueue_student_welcome_email() from public, anon, authenticated;

drop trigger if exists on_user_created_welcome_email on public.users;

create trigger on_user_created_welcome_email
  after insert on public.users
  for each row
  execute function public.enqueue_student_welcome_email();

-- Deliberately no backfill, same reasoning as the mentor welcome email:
-- telling someone who signed up months ago "welcome, you just joined" is
-- both untrue and a good way to get the sending domain marked as spam.
