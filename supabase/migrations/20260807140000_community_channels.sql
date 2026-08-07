-- ---------------------------------------------------------------------------
-- Channels a group owner can create.
-- ---------------------------------------------------------------------------
-- community_group_messages has carried a `channel` column since 20260802130000,
-- but nothing has ever written anything other than 'general' to it: the UI
-- pinned the value and the sidebar's "channels" were the page's own tabs wearing
-- a `#`. This makes the column mean what it says.
--
-- The history here matters, because multi-channel was built once and taken out
-- on purpose. #general, #announcements and #project-ideas shipped as fixed rooms
-- and split a handful of messages three ways, so two of them read as abandoned
-- in every group. The lesson was not "channels are wrong" — it was "channels
-- nobody asked for are wrong". So:
--
--   * There are no default channels. A new group has exactly one room, as today.
--     A channel exists only because an owner deliberately made it.
--   * Only the owner (or an admin) can make one. A room per member is the same
--     failure with more authors.
--   * Ten per group, hard cap. Past that the sidebar is the problem, not the
--     feature.
--   * 'general' is reserved. It is where the built-in room already writes, and a
--     second channel claiming that slug would silently share its history.
--
-- Existing messages are not touched or moved. #general-chat keeps reading and
-- writing channel = 'general', so this migration cannot lose a conversation:
-- everything it adds is additive, and dropping the table would restore today's
-- behaviour exactly.

begin;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
-- The slug is the join key into community_group_messages.channel, not a foreign
-- key — messages predate this table and must keep resolving without a row here.
-- That is also why the slug is immutable in the API below: renaming it would
-- orphan every message already filed under the old one.
create table if not exists public.community_channels (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 32),
  -- Shown under the channel name as its topic. Optional; a channel called
  -- #resources does not need a sentence explaining it.
  topic text check (topic is null or char_length(btrim(topic)) <= 140),
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (community_id, slug)
);

create index if not exists community_channels_community_idx
  on public.community_channels (community_id, created_at asc);

alter table public.community_channels enable row level security;

-- SELECT only. Every write goes through the SECURITY DEFINER functions below,
-- which check ownership themselves; RLS denies direct writes by default, which
-- is what we want. The read policy exists so realtime can deliver inserts to
-- subscribed members — a channel appearing in someone else's sidebar without a
-- refresh is the whole point of putting it in the publication.
--
-- The `auth.uid() is not null` is doing real work and is not redundant with
-- can_view_community. That helper answers true for any *public* group whatever
-- the caller, signed in or not, which is right for a group's name and
-- description but wrong here: list_group_messages is authenticated-only on
-- purpose, so a signed-out visitor cannot read a word of any channel. Handing
-- them the room names would be an inventory of doors they cannot open. Both
-- layers now agree on that instead of leaving the grant as the only thing
-- enforcing it.
drop policy if exists "View community channels" on public.community_channels;
create policy "View community channels"
on public.community_channels
for select
using (auth.uid() is not null and public.can_view_community(community_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Read
-- ---------------------------------------------------------------------------
-- message_count comes back with the list because both callers need it: the
-- sidebar shows it as a badge, and the delete confirmation has to be able to say
-- "this removes 34 messages" rather than asking the owner to guess.
drop function if exists public.list_community_channels(uuid);

create or replace function public.list_community_channels(p_community_id uuid)
returns table (
  id uuid,
  slug text,
  topic text,
  created_by uuid,
  created_at timestamptz,
  message_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    ch.id,
    ch.slug,
    ch.topic,
    ch.created_by,
    ch.created_at,
    (
      select count(*)::integer
        from public.community_group_messages m
       where m.community_id = ch.community_id
         and m.channel = ch.slug
    )
  from public.community_channels ch
  where ch.community_id = p_community_id
    and auth.uid() is not null
    and public.can_view_community(p_community_id, auth.uid())
  order by ch.created_at asc;
$$;

-- ---------------------------------------------------------------------------
-- Create
-- ---------------------------------------------------------------------------
-- Takes what the owner typed and slugifies it server-side rather than trusting a
-- slug from the client. The client previews the same transformation, but the
-- value that lands in the table is the one Postgres derived.
drop function if exists public.create_community_channel(uuid, text, text);

create or replace function public.create_community_channel(
  p_community_id uuid,
  p_name text,
  p_topic text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_slug text;
  v_topic text;
  v_count integer;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to add a channel';
  end if;

  if not exists (
    select 1 from public.communities c
     where c.id = p_community_id
       and (c.owner_id = auth.uid() or public.is_admin_user(auth.uid()))
  ) then
    raise exception 'Only the group owner can add channels';
  end if;

  v_slug := public.slugify(p_name);

  if v_slug is null or v_slug = '' then
    raise exception 'Give the channel a name using letters or numbers';
  end if;

  if char_length(v_slug) < 2 or char_length(v_slug) > 32 then
    raise exception 'Channel names are between 2 and 32 characters';
  end if;

  -- 'general' is the built-in room's channel. The other three are the page's own
  -- views (#general-chat, #discussions-posts, #join-requests) — a channel with
  -- one of those slugs would render twice in the sidebar and only one of them
  -- would work.
  if v_slug in ('general', 'general-chat', 'discussions-posts', 'join-requests') then
    raise exception '#% is already part of every group', v_slug;
  end if;

  select count(*) into v_count
    from public.community_channels
   where community_id = p_community_id;

  if v_count >= 10 then
    raise exception 'A group can have 10 channels. Remove one to add another.';
  end if;

  if exists (
    select 1 from public.community_channels
     where community_id = p_community_id and slug = v_slug
  ) then
    raise exception '#% already exists in this group', v_slug;
  end if;

  v_topic := nullif(btrim(coalesce(p_topic, '')), '');
  if v_topic is not null and char_length(v_topic) > 140 then
    v_topic := left(v_topic, 140);
  end if;

  insert into public.community_channels (community_id, slug, topic, created_by)
  values (p_community_id, v_slug, v_topic, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Delete
-- ---------------------------------------------------------------------------
-- Returns the number of messages it destroyed, so the caller can report what
-- actually happened rather than assume. The messages have to go explicitly:
-- they are linked by the slug text, not by a foreign key, so nothing cascades,
-- and leaving them would resurrect the whole conversation the moment somebody
-- recreated a channel with the same name.
drop function if exists public.delete_community_channel(uuid);

create or replace function public.delete_community_channel(p_channel_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_community_id uuid;
  v_slug text;
  v_removed integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to remove a channel';
  end if;

  select community_id, slug into v_community_id, v_slug
    from public.community_channels
   where id = p_channel_id;

  if v_community_id is null then
    raise exception 'That channel no longer exists';
  end if;

  if not exists (
    select 1 from public.communities c
     where c.id = v_community_id
       and (c.owner_id = auth.uid() or public.is_admin_user(auth.uid()))
  ) then
    raise exception 'Only the group owner can remove channels';
  end if;

  delete from public.community_group_messages
   where community_id = v_community_id and channel = v_slug;
  get diagnostics v_removed = row_count;

  delete from public.community_channels where id = p_channel_id;

  return v_removed;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Postgres grants EXECUTE to PUBLIC on every new function and PostgREST exposes
-- everything in `public` at /rest/v1/rpc/<name>, so a new function is a public
-- endpoint until this block runs. Revoking from `anon` alone would be a no-op
-- while the PUBLIC grant stands — see 20260804170000.
--
-- Nothing is granted to anon. list_group_messages is authenticated-only, so a
-- signed-out visitor cannot read a word of any channel; handing them the list of
-- room names would only be an inventory of doors they cannot open.
revoke all on function public.list_community_channels(uuid) from public, anon, authenticated;
revoke all on function public.create_community_channel(uuid, text, text) from public, anon, authenticated;
revoke all on function public.delete_community_channel(uuid) from public, anon, authenticated;

grant execute on function public.list_community_channels(uuid) to authenticated;
grant execute on function public.create_community_channel(uuid, text, text) to authenticated;
grant execute on function public.delete_community_channel(uuid) to authenticated;

-- Tables get the same treatment, and this one is not the schema default.
-- Supabase ships `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO anon,
-- authenticated`, so a brand new table arrives with SELECT/INSERT/UPDATE/DELETE
-- already granted to both — verified on this database, where every existing
-- community table carries all seven privileges for `anon`. RLS is what actually
-- stops the writes, which is the intended Supabase model, but nothing here ever
-- writes to this table from the client: creates and deletes go through the two
-- functions above. Leaving INSERT and DELETE granted would mean a single
-- future policy mistake is the only thing between anon and the table, so the
-- privileges come off and only what realtime needs goes back on.
revoke all on table public.community_channels from anon, authenticated;
grant select on table public.community_channels to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
-- Same treatment as community_group_messages: REPLICA IDENTITY DEFAULT means
-- payload.old is PK-only, so subscribers re-run list_community_channels on any
-- event rather than reading fields off the row.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'community_channels'
  ) then
    alter publication supabase_realtime add table public.community_channels;
  end if;
end $$;

comment on table public.community_channels is
  'Extra chat rooms inside a group, created by its owner. slug joins to community_group_messages.channel; the built-in room is the implicit ''general'' channel and has no row here.';

commit;
