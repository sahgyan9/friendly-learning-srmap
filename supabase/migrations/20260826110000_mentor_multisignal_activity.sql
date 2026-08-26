-- Multi-signal activity timestamp for mentor profiles.
--
-- Why this replaces 20260823170000_mentor_activity_stats.sql:
-- Previously, `last_message_at` measured *only* 1-on-1 direct messages sent by
-- the mentor. This created a cold-start catch-22 for active/new mentors: if no
-- mentee had sent them a message yet, they had nothing to reply to, and thus
-- showed up as "quiet/dormant" even if they logged in daily, posted in
-- community channels, or participated in group chats.
--
-- Reply statistics (students_helped, requests_received, requests_answered,
-- median_reply_minutes) remain strictly measured from real two-way 1-on-1
-- conversations to prevent fabricated or inflated stats.
--
-- `last_message_at` is now the greatest timestamp across:
--   1. 1-on-1 direct messages (public.messages)
--   2. Community group chat messages (public.community_group_messages)
--   3. Community posts authored (public.community_posts)
--   4. Post comments authored (public.post_comments)
--   5. Active user presence / heartbeat (public.user_presence)
--   6. Platform login timestamp (auth.users)

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
set search_path = public, auth, pg_temp
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
  ),
  activity_stamps as (
    select max(m.sent_at) as ts from public.messages m where m.sender_id = p_user_id
    union all
    select max(cgm.created_at) as ts from public.community_group_messages cgm where cgm.sender_id = p_user_id
    union all
    select max(cp.created_at) as ts from public.community_posts cp where cp.author_id = p_user_id
    union all
    select max(pc.created_at) as ts from public.post_comments pc where pc.user_id = p_user_id
    union all
    select max(up.last_seen) as ts from public.user_presence up where up.user_id = p_user_id
    union all
    select max(u.last_sign_in_at) as ts from auth.users u where u.id = p_user_id
  )
  select
    (select count(*)::int from two_way),
    (select count(*)::int from answered),
    (select count(*)::int from answered where replied_at is not null),
    (select percentile_cont(0.5) within group (
              order by extract(epoch from (replied_at - asked_at)) / 60.0
            )::int
       from answered where replied_at is not null),
    (select max(ts) from activity_stamps)
  from (select 1) as _guard
  where exists (select 1 from public.mentors mm where mm.id = p_user_id);
$$;

comment on function public.mentor_activity(uuid) is
  'Aggregate reply counts, turnaround, and latest platform activity timestamp across messages, community discussions, and presence. Public because the mentor profile that displays it is public.';

revoke all on function public.mentor_activity(uuid) from public, anon, authenticated;
grant execute on function public.mentor_activity(uuid) to anon, authenticated;
