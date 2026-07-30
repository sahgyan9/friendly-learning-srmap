-- Queue outbound email instead of sending it from inside the message trigger.
--
-- Four problems with the previous arrangement, all fixed by the same change:
--
-- 1. Open relay. send-message-notification took recipient_email, sender_name and
--    message_content straight from the request body with verify_jwt = false and
--    no auth of its own, interpolating them unescaped into the HTML. Anyone who
--    knew the URL could send arbitrary mail, with arbitrary links, from the
--    project's own from-address. Nothing was delivered only because the domain
--    was never verified in Resend -- the hole goes live the moment it is. No
--    amount of authentication fixes a function shaped like this, so the sender
--    now reads recipients and content from this table and accepts neither.
--
-- 2. Silent failure. The function returned HTTP 200 {"success": true} while
--    Resend rejected every send with a 403. A year of failures looked like a
--    year of successes. Failures are now recorded per row in last_error.
--
-- 3. Blocking inserts. notify_message_email() called http_post, which is
--    synchronous, so every message insert waited on a round trip to Resend.
--    Enqueuing is a local write.
--
-- 4. One email per message. Twenty rapid messages meant twenty emails, which is
--    the fastest way to get filtered as spam. Rows are swept on a schedule and
--    collapsed per conversation, and anything the recipient has already read is
--    dropped unsent.

create table if not exists public.email_queue (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references auth.users(id) on delete cascade,
  kind          text not null default 'message',
  -- What the email is about. Deliberately references rather than copies: the
  -- sweeper re-reads the message at send time, so a queued row cannot deliver
  -- content that has since been deleted.
  message_id    uuid references public.messages(id) on delete cascade,
  conversation_id uuid,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz,
  attempts      int not null default 0,
  last_error    text
);

-- The sweeper's only query: unsent rows, oldest first.
create index if not exists email_queue_pending_idx
  on public.email_queue (created_at)
  where sent_at is null;

create index if not exists email_queue_recipient_idx
  on public.email_queue (recipient_id, conversation_id)
  where sent_at is null;

-- No policies, and RLS on: nothing reachable with an anon or user key can read
-- or write this table. Only the service role (which bypasses RLS) touches it.
alter table public.email_queue enable row level security;

comment on table public.email_queue is
  'Outbound email waiting to be sent. Written by triggers, drained by the send-email-queue function on a schedule. Never exposed to clients.';

-- ---------------------------------------------------------------------------
-- One-click unsubscribe.
-- ---------------------------------------------------------------------------
-- The old footer linked to /profile, which demands a login. Gmail and Yahoo's
-- bulk sender rules expect a link that works without one, and a recipient who
-- cannot easily stop the mail reports it as spam instead.

alter table public.users
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists users_unsubscribe_token_key
  on public.users (unsubscribe_token);

comment on column public.users.unsubscribe_token is
  'Opaque token for one-click unsubscribe from email. Safe to put in a URL; grants nothing but turning email_notifications off.';

-- ---------------------------------------------------------------------------
-- Enqueue on new message. No HTTP, nothing that can fail the insert.
-- ---------------------------------------------------------------------------

create or replace function public.notify_message_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
begin
  select u.email_notifications into v_enabled
    from public.users u
   where u.id = new.receiver_id;

  -- Respect the preference at enqueue time and again at send time; a person who
  -- opts out between the two should not receive what was already queued.
  if coalesce(v_enabled, true) then
    insert into public.email_queue (recipient_id, kind, message_id, conversation_id)
    values (new.receiver_id, 'message', new.id, new.conversation_id);
  end if;

  return new;
exception when others then
  -- Never let notification bookkeeping fail the message itself.
  raise warning 'Could not enqueue email for message %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_message_created_email_notification on public.messages;

create trigger on_message_created_email_notification
  after insert on public.messages
  for each row
  execute function public.notify_message_email();
