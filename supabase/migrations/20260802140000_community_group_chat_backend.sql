-- ---------------------------------------------------------------------------
-- Group chat, for real: replaces the localStorage-only prototype.
-- ---------------------------------------------------------------------------
-- community_group_messages already exists (20260802130000). What was missing
-- was any way to read it back with a sender's name and avatar attached —
-- public.users is owner-only readable, so the client can never join it
-- itself. Every other read in this codebase solves that with a SECURITY
-- DEFINER function that does the join server-side; this does the same.

-- Reactions get their own table rather than living in the jsonb column the
-- messages table already has. A bare counter can't remember *who* reacted,
-- so two people clicking the same emoji is indistinguishable from one person
-- double-clicking it, and "did I react to this" becomes unanswerable once
-- the page reloads. A row per (message, user, emoji) answers both for free.
create table if not exists public.community_group_message_reactions (
  message_id uuid not null references public.community_group_messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table public.community_group_message_reactions enable row level security;

drop policy if exists "View group message reactions" on public.community_group_message_reactions;
create policy "View group message reactions"
on public.community_group_message_reactions
for select
using (
  exists (
    select 1 from public.community_group_messages m
    where m.id = community_group_message_reactions.message_id
      and public.can_view_community(m.community_id, auth.uid())
  )
);

-- No insert/update/delete policy: every write goes through
-- toggle_group_message_reaction below, which runs as the table owner and
-- checks membership itself. RLS defaults to deny, which is what we want for
-- direct table access here.

drop function if exists public.list_group_messages(uuid, text, integer);

create or replace function public.list_group_messages(
  p_community_id uuid,
  p_channel text default 'general',
  p_limit integer default 200
)
returns table (
  id uuid,
  sender_id uuid,
  sender_name text,
  sender_avatar text,
  is_owner boolean,
  is_mentor boolean,
  channel text,
  content text,
  reply_to_id uuid,
  reply_to_sender_name text,
  reply_to_content text,
  reactions jsonb,
  viewer_reactions text[],
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    m.id,
    m.sender_id,
    coalesce(u.name, 'A student'),
    u.profile_image,
    (m.sender_id = c.owner_id),
    public.is_active_mentor(m.sender_id),
    m.channel,
    m.content,
    m.reply_to_id,
    ru.name,
    r.content,
    coalesce((
      select jsonb_object_agg(g.emoji, g.reaction_count)
        from (
          select emoji, count(*) as reaction_count
            from public.community_group_message_reactions
           where message_id = m.id
           group by emoji
        ) g
    ), '{}'::jsonb),
    coalesce((
      select array_agg(emoji)
        from public.community_group_message_reactions
       where message_id = m.id and user_id = auth.uid()
    ), '{}'::text[]),
    m.created_at
  from public.community_group_messages m
  join public.communities c on c.id = m.community_id
  left join public.users u on u.id = m.sender_id
  left join public.community_group_messages r on r.id = m.reply_to_id
  left join public.users ru on ru.id = r.sender_id
  where m.community_id = p_community_id
    and m.channel = p_channel
    and public.can_view_community(p_community_id, auth.uid())
  order by m.created_at asc
  limit greatest(least(p_limit, 300), 1);
$$;

grant execute on function public.list_group_messages(uuid, text, integer) to anon, authenticated;

drop function if exists public.send_group_message(uuid, text, text, uuid);

create or replace function public.send_group_message(
  p_community_id uuid,
  p_channel text,
  p_content text,
  p_reply_to_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to send a message';
  end if;

  if btrim(coalesce(p_content, '')) = '' then
    raise exception 'Message cannot be empty';
  end if;

  if length(p_content) > 2000 then
    raise exception 'Message is too long';
  end if;

  if not exists (
    select 1 from public.communities c
    where c.id = p_community_id
      and (
        c.owner_id = auth.uid()
        or exists (
          select 1 from public.community_members cm
          where cm.community_id = c.id and cm.user_id = auth.uid()
        )
      )
  ) then
    raise exception 'Join this group to post messages';
  end if;

  insert into public.community_group_messages (community_id, sender_id, channel, content, reply_to_id)
  values (p_community_id, auth.uid(), coalesce(nullif(btrim(p_channel), ''), 'general'), btrim(p_content), p_reply_to_id)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.send_group_message(uuid, text, text, uuid) to authenticated;

drop function if exists public.toggle_group_message_reaction(uuid, text);

create or replace function public.toggle_group_message_reaction(
  p_message_id uuid,
  p_emoji text
)
returns boolean -- true if the caller now has this reaction on the message, false if it was just removed
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_community_id uuid;
  v_deleted_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to react';
  end if;

  select community_id into v_community_id
    from public.community_group_messages
   where id = p_message_id;

  if v_community_id is null then
    raise exception 'Message not found';
  end if;

  if not public.can_view_community(v_community_id, auth.uid()) then
    raise exception 'Not allowed';
  end if;

  delete from public.community_group_message_reactions
   where message_id = p_message_id and user_id = auth.uid() and emoji = p_emoji;
  get diagnostics v_deleted_count = row_count;

  if v_deleted_count > 0 then
    return false;
  end if;

  insert into public.community_group_message_reactions (message_id, user_id, emoji)
  values (p_message_id, auth.uid(), p_emoji)
  on conflict do nothing;

  return true;
end;
$$;

grant execute on function public.toggle_group_message_reaction(uuid, text) to authenticated;

-- Live updates: open chats pick up new messages without a manual refresh.
-- payload.old on this table is PK-only under REPLICA IDENTITY DEFAULT (same
-- gotcha as public.messages) — the client re-fetches via list_group_messages
-- on any event rather than trying to read sender details off the payload.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'community_group_messages'
  ) then
    alter publication supabase_realtime add table public.community_group_messages;
  end if;
end $$;
