-- Real reply statistics for a mentor profile.
--
-- Why this exists: the profile page displayed "91% response rate", "Replies
-- within 3 hours" and "12+ Mentees Mentored" for every mentor on the site.
-- Those were string constants in src/utils/mentor-enhancements.ts, falling back
-- off a `mentor.availability_schedule` field that is not a column and never was
-- -- so the fallback fired for 100% of mentors, including someone who signed up
-- yesterday and has never had a conversation.
--
-- The same repo already made this call once, for work history:
--   "Experiences -- mentor-entered, no fallback. An invented work history read
--    as real, so an empty list now just means the section is empty."
-- Invented statistics are worse, because a fresher picks who to message with
-- them, and "91%" reads as measured where a generic tagline does not.
--
-- Everything below is derived from conversations that actually happened. No new
-- tracking, no new columns, and it works retroactively against existing history.

-- ---------------------------------------------------------------------------
-- What counts as answering.
-- ---------------------------------------------------------------------------
-- A "request" is someone sending this mentor a message. It is answered if the
-- mentor sent anything back afterwards. Turnaround is measured from the incoming
-- message to the mentor's first reply after it.
--
-- `students_helped` deliberately reuses the certificate's definition from
-- 20260730190000_mentor_certificates.sql -- distinct people where both sides
-- spoke. Counting conversations instead would let anyone inflate the figure by
-- opening chats nobody answered. The certificate and the profile must not print
-- different numbers for the same person.
--
-- Median, not mean, for turnaround: one mentor who answered a message three
-- weeks late should not swamp forty replies inside an hour.

create or replace function public.mentor_activity(p_user_id uuid)
returns table (
  students_helped      int,
  requests_received    int,
  requests_answered    int,
  median_reply_minutes int,
  last_message_at      timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with convo as (
    select c.id,
           case when c.user1_id = p_user_id then c.user2_id else c.user1_id end as other_id
      from public.conversations c
     where (c.user1_id = p_user_id or c.user2_id = p_user_id)
       and c.user1_id <> c.user2_id
  ),
  two_way as (
    select distinct v.other_id
      from convo v
     where exists (
             select 1 from public.messages m
              where m.conversation_id = v.id and m.sender_id = p_user_id
           )
       and exists (
             select 1 from public.messages m
              where m.conversation_id = v.id and m.sender_id <> p_user_id
           )
  ),
  asked as (
    select v.id, min(m.sent_at) as asked_at
      from convo v
      join public.messages m on m.conversation_id = v.id
     where m.sender_id <> p_user_id
     group by v.id
  ),
  answered as (
    select a.id,
           a.asked_at,
           (select min(m.sent_at)
              from public.messages m
             where m.conversation_id = a.id
               and m.sender_id = p_user_id
               and m.sent_at >= a.asked_at) as replied_at
      from asked a
  )
  select
    (select count(*)::int from two_way),
    (select count(*)::int from answered),
    (select count(*)::int from answered where replied_at is not null),
    (select percentile_cont(0.5) within group (
              order by extract(epoch from (replied_at - asked_at)) / 60.0
            )::int
       from answered where replied_at is not null),
    (select max(m.sent_at)
       from public.messages m
      where m.sender_id = p_user_id)
  -- Returns no row for a non-mentor. This bypasses RLS on messages, so it must
  -- not become a way to read any user's activity by guessing UUIDs -- the
  -- figures are public only because a mentor profile is public.
  from (select 1) as _guard
  where exists (select 1 from public.mentors mm where mm.id = p_user_id);
$$;

comment on function public.mentor_activity(uuid) is
  'Aggregate reply counts and median turnaround for one mentor. No message content, no counterparty identities. Public because the mentor profile that displays it is public.';

-- Supabase grants EXECUTE on new functions to anon and authenticated by
-- default, and revoking from PUBLIC alone does not remove those.
revoke all on function public.mentor_activity(uuid) from public, anon, authenticated;
grant execute on function public.mentor_activity(uuid) to anon, authenticated;

-- The correlated subqueries above walk this mentor's messages per conversation.
create index if not exists messages_conversation_sender_sent_idx
  on public.messages (conversation_id, sender_id, sent_at);
