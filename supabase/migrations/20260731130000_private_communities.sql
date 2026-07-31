-- Private communities: groups that are discoverable but not walk-in.
--
-- The communities migration wrote down two decisions and said reversing either
-- would take a migration rather than a config change. This is that migration,
-- and it reverses both — but only for groups that opt in.
--
--   visibility = 'public'  (default) — unchanged in every respect. Anyone signed
--                          in can join, anyone at all can read the posts.
--   visibility = 'private'          — still listed, still searchable, name and
--                          description and member count still visible, because a
--                          group nobody can find is a group nobody joins. What
--                          changes is that joining goes through the owner, and
--                          the posts inside are readable only by members.
--
-- The second half is the part that costs real work, and skipping it was not an
-- option. A group labelled "Private" whose posts anyone can pull straight out of
-- the API is worse than having no private groups at all: it invites people to
-- put things somewhere they believe is closed. So every read path is closed
-- here, not just the join button.
--
-- There are four such paths and all four had to change, which is why this file
-- is long:
--
--   1. RLS on community_posts, post_comments and post_likes, all three of which
--      were `using (true)`.
--   2. get_community_feed and get_community_post, which are SECURITY DEFINER and
--      therefore ignore the policies in (1) entirely.
--   3. get_post_comments, same.
--   4. get_community_members, so a private group's roster is members-only too.
--
-- Missing any one of them would have left the content reachable by a different
-- route while the UI showed a padlock.

-- ---------------------------------------------------------------------------
-- Visibility
-- ---------------------------------------------------------------------------

alter table public.communities
  add column if not exists visibility text not null default 'public';

alter table public.communities
  drop constraint if exists communities_visibility_check;
alter table public.communities
  add constraint communities_visibility_check
  check (visibility in ('public', 'private'));

comment on column public.communities.visibility is
  'public: anyone may join and read. private: listed to everyone, but joining needs the owner and posts are members-only.';

create index if not exists communities_visibility_idx
  on public.communities (visibility) where not is_archived;

-- ---------------------------------------------------------------------------
-- Asking to get in, and being asked in
-- ---------------------------------------------------------------------------
-- Two directions, two tables. Collapsing them into one "pending membership"
-- table reads as tidier and then immediately needs a column to say which way it
-- points, different rules for who may create versus accept each direction, and
-- a careful answer to what happens when both exist at once. Separate tables make
-- each rule a policy on its own table.

create table if not exists public.community_join_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'withdrawn')),
  -- Optional. "I am in the same DSA course" gets more yeses than a bare request.
  message text check (message is null or char_length(message) <= 300),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.users(id) on delete set null
);

-- One live request per person per group. Settled ones are kept as history, so a
-- second ask after a decline is a new row rather than an edit of the refusal.
create unique index if not exists community_join_requests_one_pending_idx
  on public.community_join_requests (community_id, user_id)
  where status = 'pending';

create index if not exists community_join_requests_community_idx
  on public.community_join_requests (community_id, status, created_at desc);
create index if not exists community_join_requests_user_idx
  on public.community_join_requests (user_id, status);

create table if not exists public.community_invites (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  invited_user_id uuid not null references public.users(id) on delete cascade,
  invited_by uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'revoked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists community_invites_one_pending_idx
  on public.community_invites (community_id, invited_user_id)
  where status = 'pending';

create index if not exists community_invites_user_idx
  on public.community_invites (invited_user_id, status, created_at desc);
create index if not exists community_invites_community_idx
  on public.community_invites (community_id, status);

-- ---------------------------------------------------------------------------
-- The one question every read path asks
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER because a policy on community_posts must be able to ask about
-- membership without community_members being readable to the asker, and STABLE
-- so a feed of twenty posts in one private group answers it once, not twenty
-- times.

-- SECURITY DEFINER, and therefore reachable at /rest/v1/rpc — a policy is
-- evaluated as the calling role, so the calling role must hold EXECUTE on
-- anything the policy calls, and that cannot be revoked without breaking the
-- policy. Which makes the p_user_id argument an oracle unless it is handled:
-- anon could otherwise ask can_view_community(<private group>, <someone else>)
-- and read back whether that person is a member.
--
-- So the argument is accepted but never trusted. A value that is not the caller
-- is ignored rather than answered. Every real call site passes auth.uid(), so
-- the only thing this changes is the oracle.
create or replace function public.can_view_community(p_community_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    -- A post on the open board belongs to no community and is public by nature.
    when p_community_id is null then true
    else exists (
      select 1
        from public.communities c
       where c.id = p_community_id
         and (
           c.visibility = 'public'
           or (
             auth.uid() is not null
             and p_user_id is not distinct from auth.uid()
             and (
               c.owner_id = auth.uid()
               or exists (
                 select 1 from public.community_members m
                  where m.community_id = c.id and m.user_id = auth.uid()
               )
               or public.is_admin_user(auth.uid())
             )
           )
         )
    )
  end;
$$;

comment on function public.can_view_community(uuid, uuid) is
  'Whether the caller may read what is inside the group. Public: everyone. Private: members, owner, admins. Only ever answers about the caller.';

create or replace function public.can_view_post(p_post_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select public.can_view_community(p.community_id, p_user_id)
       from public.community_posts p
      where p.id = p_post_id),
    false  -- a post that does not exist is not readable
  );
$$;

comment on function public.can_view_post(uuid, uuid) is
  'Read gate for anything hanging off a post — comments, likes — so they cannot leak what the post itself would not show.';

-- ---------------------------------------------------------------------------
-- Closing the three `using (true)` read policies
-- ---------------------------------------------------------------------------
-- Every one of these keeps the old behaviour exactly for board posts
-- (community_id is null) and for public groups. Only private groups narrow.

drop policy if exists "Anyone can view community posts" on public.community_posts;
create policy "Anyone can view community posts"
  on public.community_posts for select
  using (
    community_id is null
    or public.can_view_community(community_id, auth.uid())
  );

drop policy if exists "Anyone can view comments" on public.post_comments;
create policy "Anyone can view comments"
  on public.post_comments for select
  using (public.can_view_post(post_id, auth.uid()));

drop policy if exists "Anyone can view post likes" on public.post_likes;
create policy "Anyone can view post likes"
  on public.post_likes for select
  using (public.can_view_post(post_id, auth.uid()));

-- Commenting and liking inside a private group need the same gate as reading;
-- without it a non-member could still write into a group they cannot see.
drop policy if exists "Authenticated users can comment" on public.post_comments;
create policy "Authenticated users can comment"
  on public.post_comments for insert
  to authenticated
  with check (auth.uid() = user_id and public.can_view_post(post_id, auth.uid()));

drop policy if exists "Authenticated users can like posts" on public.post_likes;
create policy "Authenticated users can like posts"
  on public.post_likes for insert
  to authenticated
  with check (auth.uid() = user_id and public.can_view_post(post_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Joining
-- ---------------------------------------------------------------------------
-- Public groups keep walk-in joining. Private groups accept a self-insert only
-- when the person is holding an approved request or a pending invite; the owner
-- can always add someone directly.

drop policy if exists "Join a community, or be added by its owner" on public.community_members;
create policy "Join a community, or be added by its owner"
  on public.community_members for insert
  to authenticated
  with check (
    role = 'member'
    and exists (
      select 1 from public.communities c
       where c.id = community_id
         and not c.is_archived
         and (
           public.is_community_owner(c.id, auth.uid())
           or (
             user_id = auth.uid()
             and (
               c.visibility = 'public'
               or exists (
                 select 1 from public.community_join_requests r
                  where r.community_id = c.id
                    and r.user_id = auth.uid()
                    and r.status = 'approved'
               )
               or exists (
                 select 1 from public.community_invites i
                  where i.community_id = c.id
                    and i.invited_user_id = auth.uid()
                    and i.status = 'pending'
               )
             )
           )
         )
    )
  );

-- A private group's roster is part of what is private.
drop policy if exists "Anyone can view members" on public.community_members;
create policy "Anyone can view members"
  on public.community_members for select
  using (public.can_view_community(community_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- RLS on the two new tables
-- ---------------------------------------------------------------------------

alter table public.community_join_requests enable row level security;
alter table public.community_invites enable row level security;

-- You see your own requests; the owner sees requests for their group.
drop policy if exists "See your own requests or your group's" on public.community_join_requests;
create policy "See your own requests or your group's"
  on public.community_join_requests for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_community_owner(community_id, auth.uid())
    or public.is_admin_user(auth.uid())
  );

drop policy if exists "Ask to join a private group" on public.community_join_requests;
create policy "Ask to join a private group"
  on public.community_join_requests for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.communities c
       where c.id = community_id
         and not c.is_archived
         and c.visibility = 'private'
    )
    -- Asking to join something you are already in is a UI bug, not a request.
    and not exists (
      select 1 from public.community_members m
       where m.community_id = community_id and m.user_id = auth.uid()
    )
  );

-- The owner decides; the asker may only withdraw. Which of those you are doing
-- is enforced in decide_join_request / withdraw_join_request rather than here,
-- because a policy cannot easily say "you may set this column to exactly these
-- values", and a request the asker could mark 'approved' is not a request.
drop policy if exists "Owners decide, askers withdraw" on public.community_join_requests;
create policy "Owners decide, askers withdraw"
  on public.community_join_requests for update
  to authenticated
  using (
    public.is_community_owner(community_id, auth.uid())
    or public.is_admin_user(auth.uid())
    or (user_id = auth.uid() and status = 'pending')
  )
  with check (
    public.is_community_owner(community_id, auth.uid())
    or public.is_admin_user(auth.uid())
    or (user_id = auth.uid() and status = 'withdrawn')
  );

drop policy if exists "See invites to you or from your group" on public.community_invites;
create policy "See invites to you or from your group"
  on public.community_invites for select
  to authenticated
  using (
    invited_user_id = auth.uid()
    or public.is_community_owner(community_id, auth.uid())
    or public.is_admin_user(auth.uid())
  );

drop policy if exists "Owners invite" on public.community_invites;
create policy "Owners invite"
  on public.community_invites for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and status = 'pending'
    and public.is_community_owner(community_id, auth.uid())
    and not exists (
      select 1 from public.community_members m
       where m.community_id = community_id and m.user_id = invited_user_id
    )
  );

drop policy if exists "Respond to an invite, or revoke one" on public.community_invites;
create policy "Respond to an invite, or revoke one"
  on public.community_invites for update
  to authenticated
  using (
    invited_user_id = auth.uid()
    or public.is_community_owner(community_id, auth.uid())
    or public.is_admin_user(auth.uid())
  )
  with check (
    invited_user_id = auth.uid()
    or public.is_community_owner(community_id, auth.uid())
    or public.is_admin_user(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Deciding
-- ---------------------------------------------------------------------------
-- Approving has to both settle the request and create the membership. Two round
-- trips from the client would leave an approved request with no member behind it
-- whenever the second one failed.

create or replace function public.decide_join_request(
  p_request_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_req public.community_join_requests%rowtype;
  v_name text;
begin
  if v_actor is null then
    raise exception 'You need to be signed in' using errcode = '28000';
  end if;

  select * into v_req
    from public.community_join_requests
   where id = p_request_id
   for update;

  if not found then
    raise exception 'That request no longer exists' using errcode = 'P0002';
  end if;

  if not (public.is_community_owner(v_req.community_id, v_actor)
          or public.is_admin_user(v_actor)) then
    raise exception 'Only the group owner can decide this' using errcode = '42501';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'That request has already been dealt with' using errcode = '22023';
  end if;

  update public.community_join_requests
     set status = case when p_approve then 'approved' else 'declined' end,
         decided_at = now(),
         decided_by = v_actor
   where id = p_request_id;

  if p_approve then
    insert into public.community_members (community_id, user_id, role)
    values (v_req.community_id, v_req.user_id, 'member')
    on conflict do nothing;
  end if;

  select name into v_name from public.communities where id = v_req.community_id;

  insert into public.notifications (user_id, type, title, content)
  values (
    v_req.user_id,
    'system',
    case when p_approve then 'You are in 🎉' else 'Request not accepted' end,
    case
      when p_approve then format('You have joined %s. Say hello — the group can see your posts now.', coalesce(v_name, 'the group'))
      else format('Your request to join %s was not accepted this time.', coalesce(v_name, 'that group'))
    end
  );
end;
$$;

comment on function public.decide_join_request(uuid, boolean) is
  'Owner approves or declines a pending request. Approving also creates the membership, in one transaction.';

revoke all on function public.decide_join_request(uuid, boolean) from public, anon;
grant execute on function public.decide_join_request(uuid, boolean) to authenticated;

-- Accepting an invite is the invitee's side of the same shape.
create or replace function public.respond_to_invite(
  p_invite_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_inv public.community_invites%rowtype;
begin
  if v_actor is null then
    raise exception 'You need to be signed in' using errcode = '28000';
  end if;

  select * into v_inv
    from public.community_invites
   where id = p_invite_id
   for update;

  if not found then
    raise exception 'That invitation no longer exists' using errcode = 'P0002';
  end if;

  if v_inv.invited_user_id <> v_actor then
    raise exception 'That invitation is not yours' using errcode = '42501';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'You have already responded to that invitation' using errcode = '22023';
  end if;

  update public.community_invites
     set status = case when p_accept then 'accepted' else 'declined' end,
         responded_at = now()
   where id = p_invite_id;

  if p_accept then
    insert into public.community_members (community_id, user_id, role)
    values (v_inv.community_id, v_actor, 'member')
    on conflict do nothing;

    -- Any request they had outstanding is now moot.
    update public.community_join_requests
       set status = 'approved', decided_at = now(), decided_by = v_inv.invited_by
     where community_id = v_inv.community_id
       and user_id = v_actor
       and status = 'pending';
  end if;
end;
$$;

comment on function public.respond_to_invite(uuid, boolean) is
  'Invitee accepts or declines. Accepting creates the membership in the same transaction.';

revoke all on function public.respond_to_invite(uuid, boolean) from public, anon;
grant execute on function public.respond_to_invite(uuid, boolean) to authenticated;

-- Inviting by name rather than by uuid, because the owner is picking a person
-- out of a list, and notifying them, which a plain insert would not do.
create or replace function public.invite_to_community(
  p_community_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_name text;
begin
  if v_actor is null then
    raise exception 'You need to be signed in' using errcode = '28000';
  end if;

  if not public.is_community_owner(p_community_id, v_actor) then
    raise exception 'Only the group owner can invite people' using errcode = '42501';
  end if;

  if exists (select 1 from public.community_members m
              where m.community_id = p_community_id and m.user_id = p_user_id) then
    raise exception 'They are already in this group' using errcode = '22023';
  end if;

  insert into public.community_invites (community_id, invited_user_id, invited_by)
  values (p_community_id, p_user_id, v_actor)
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    -- An unanswered invite already exists; saying so beats a duplicate.
    raise exception 'They already have an invitation waiting' using errcode = '22023';
  end if;

  select name into v_name from public.communities where id = p_community_id;

  insert into public.notifications (user_id, type, title, content)
  values (
    p_user_id, 'system', 'You have been invited to a group',
    format('You have been invited to join %s.', coalesce(v_name, 'a group'))
  );

  return v_id;
end;
$$;

comment on function public.invite_to_community(uuid, uuid) is
  'Owner invites someone into their group and notifies them.';

revoke all on function public.invite_to_community(uuid, uuid) from public, anon;
grant execute on function public.invite_to_community(uuid, uuid) to authenticated;

-- Requesting, with the owner notified. The plain insert policy above also allows
-- this, but nothing there tells the owner a request is waiting.
create or replace function public.request_to_join_community(
  p_community_id uuid,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_owner uuid;
  v_name text;
  v_asker text;
begin
  if v_actor is null then
    raise exception 'You need to be signed in' using errcode = '28000';
  end if;

  select c.owner_id, c.name into v_owner, v_name
    from public.communities c
   where c.id = p_community_id and not c.is_archived and c.visibility = 'private';

  if v_owner is null then
    raise exception 'That group is not accepting requests' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.community_members m
              where m.community_id = p_community_id and m.user_id = v_actor) then
    raise exception 'You are already in this group' using errcode = '22023';
  end if;

  insert into public.community_join_requests (community_id, user_id, message)
  values (p_community_id, v_actor, nullif(btrim(coalesce(p_message, '')), ''))
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    raise exception 'You already have a request waiting on this group' using errcode = '22023';
  end if;

  select name into v_asker from public.users where id = v_actor;

  insert into public.notifications (user_id, type, title, content)
  values (
    v_owner, 'system', 'Someone wants to join your group',
    format('%s asked to join %s.', coalesce(v_asker, 'A student'), coalesce(v_name, 'your group'))
  );

  return v_id;
end;
$$;

comment on function public.request_to_join_community(uuid, text) is
  'Student asks to join a private group; the owner gets a notification.';

revoke all on function public.request_to_join_community(uuid, text) from public, anon;
grant execute on function public.request_to_join_community(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The SECURITY DEFINER read paths
-- ---------------------------------------------------------------------------
-- These bypass every policy above, so each one repeats the gate itself. This is
-- the half that is easy to forget and the half that actually leaks.

create or replace function public.get_community_feed(
  p_post_type text default null,
  p_search text default null,
  p_limit integer default 20,
  p_offset integer default 0,
  p_community_id uuid default null
)
returns table (
  id uuid, title text, content text, post_type text, status text, tags text[],
  image_url text, likes_count integer, comments_count integer,
  created_at timestamptz, updated_at timestamptz,
  author_id uuid, author_name text, author_image text, author_department text,
  author_role text, author_is_mentor boolean,
  viewer_has_liked boolean, viewer_is_author boolean,
  community_id uuid, community_name text, community_slug text,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with filtered as (
    select p.*
      from public.community_posts p
     where (
             (p_community_id is null and p.community_id is null)
             or (p_community_id is not null and p.community_id = p_community_id)
           )
       -- Added: a private group's posts are members-only, whether they are
       -- asked for directly or would otherwise fall out of a wider feed.
       and (p.community_id is null or public.can_view_community(p.community_id, auth.uid()))
       and (p_post_type is null or p_post_type = 'all' or p.post_type = p_post_type)
       and (
         p_search is null or btrim(p_search) = ''
         or p.title ilike '%' || p_search || '%'
         or p.content ilike '%' || p_search || '%'
         or exists (select 1 from unnest(p.tags) t where t ilike '%' || p_search || '%')
       )
  )
  select f.id, f.title, f.content, f.post_type, f.status, f.tags, f.image_url,
         f.likes_count, f.comments_count, f.created_at, f.updated_at,
         f.author_id, u.name, u.profile_image, u.department, u.role,
         exists (select 1 from public.mentors m where m.id = f.author_id and m.department <> 'General'),
         exists (select 1 from public.post_likes l where l.post_id = f.id and l.user_id = auth.uid()),
         (f.author_id = auth.uid()),
         f.community_id, c.name, c.slug,
         (select count(*) from filtered)
    from filtered f
    left join public.users u on u.id = f.author_id
    left join public.communities c on c.id = f.community_id
   order by f.created_at desc
   limit greatest(least(p_limit, 100), 1)
  offset greatest(p_offset, 0);
$$;

create or replace function public.get_community_post(p_post_id uuid)
returns table (
  id uuid, title text, content text, post_type text, status text, tags text[],
  image_url text, likes_count integer, comments_count integer,
  created_at timestamptz, updated_at timestamptz,
  author_id uuid, author_name text, author_image text, author_department text,
  author_role text, author_is_mentor boolean,
  viewer_has_liked boolean, viewer_is_author boolean,
  community_id uuid, community_name text, community_slug text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.title, p.content, p.post_type, p.status, p.tags, p.image_url,
         p.likes_count, p.comments_count, p.created_at, p.updated_at,
         p.author_id, u.name, u.profile_image, u.department, u.role,
         exists (select 1 from public.mentors m where m.id = p.author_id and m.department <> 'General'),
         exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         (p.author_id = auth.uid()),
         p.community_id, c.name, c.slug
    from public.community_posts p
    left join public.users u on u.id = p.author_id
    left join public.communities c on c.id = p.community_id
   where p.id = p_post_id
     -- A direct link to a private group's post is still a private post. Returns
     -- no rows rather than an error, so the page shows its ordinary not-found
     -- state instead of confirming the post exists.
     and (p.community_id is null or public.can_view_community(p.community_id, auth.uid()));
$$;

create or replace function public.get_post_comments(p_post_id uuid)
returns table (
  id uuid, content text, created_at timestamptz, updated_at timestamptz,
  author_id uuid, author_name text, author_image text, viewer_is_author boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id, c.content, c.created_at, c.updated_at,
         c.user_id, u.name, u.profile_image, (c.user_id = auth.uid())
    from public.post_comments c
    left join public.users u on u.id = c.user_id
   where c.post_id = p_post_id
     and public.can_view_post(p_post_id, auth.uid())
   order by c.created_at asc;
$$;

create or replace function public.get_community_members(
  p_community_id uuid,
  p_limit integer default 50
)
returns table (
  user_id uuid, name text, profile_image text, role text,
  is_mentor boolean, joined_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.user_id, u.name, u.profile_image, m.role,
         public.is_active_mentor(m.user_id),
         m.joined_at
    from public.community_members m
    left join public.users u on u.id = m.user_id
   where m.community_id = p_community_id
     and public.can_view_community(p_community_id, auth.uid())
   order by (m.role = 'owner') desc, m.joined_at asc
   limit greatest(least(p_limit, 200), 1);
$$;

-- ---------------------------------------------------------------------------
-- Listing: private groups stay visible, and say where the viewer stands
-- ---------------------------------------------------------------------------
-- Deliberately not filtered by visibility. A private group appears in the
-- directory with its name, description and member count exactly as before —
-- that is what makes it joinable at all. The extra columns let the card render
-- "Request to join" or "Requested" instead of a Join button that would fail.

-- Dropped rather than replaced: both of these gain columns, and Postgres will
-- not let CREATE OR REPLACE change a function's return type.
drop function if exists public.list_communities(text, text, boolean, integer, integer);

create or replace function public.list_communities(
  p_search text default null,
  p_kind text default null,
  p_mine boolean default false,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid, slug text, name text, description text, kind text, cover_image text,
  member_count integer, post_count integer, is_archived boolean,
  created_at timestamptz, owner_id uuid, owner_name text, owner_image text,
  viewer_is_member boolean, viewer_is_owner boolean,
  visibility text, viewer_has_requested boolean, viewer_has_invite boolean,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with filtered as (
    select c.*
      from public.communities c
     where not c.is_archived
       and (p_kind is null or p_kind = 'all' or c.kind = p_kind)
       and (
         p_search is null or btrim(p_search) = ''
         or c.name ilike '%' || p_search || '%'
         or c.description ilike '%' || p_search || '%'
       )
       and (
         not p_mine
         or exists (
           select 1 from public.community_members m
            where m.community_id = c.id and m.user_id = auth.uid()
         )
       )
  )
  select f.id, f.slug, f.name, f.description, f.kind, f.cover_image,
         f.member_count, f.post_count, f.is_archived, f.created_at,
         f.owner_id, u.name, u.profile_image,
         exists (select 1 from public.community_members m
                  where m.community_id = f.id and m.user_id = auth.uid()),
         (f.owner_id = auth.uid()),
         f.visibility,
         exists (select 1 from public.community_join_requests r
                  where r.community_id = f.id and r.user_id = auth.uid()
                    and r.status = 'pending'),
         exists (select 1 from public.community_invites i
                  where i.community_id = f.id and i.invited_user_id = auth.uid()
                    and i.status = 'pending'),
         (select count(*) from filtered)
    from filtered f
    left join public.users u on u.id = f.owner_id
   order by f.member_count desc, f.created_at desc
   limit greatest(least(p_limit, 60), 1)
  offset greatest(p_offset, 0);
$$;

drop function if exists public.get_community(text);

create or replace function public.get_community(p_slug text)
returns table (
  id uuid, slug text, name text, description text, kind text, cover_image text,
  member_count integer, post_count integer, is_archived boolean,
  created_at timestamptz, owner_id uuid, owner_name text, owner_image text,
  viewer_is_member boolean, viewer_is_owner boolean, viewer_can_post boolean,
  visibility text, viewer_can_view boolean,
  viewer_has_requested boolean, viewer_has_invite boolean,
  pending_request_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id, c.slug, c.name, c.description, c.kind, c.cover_image,
         c.member_count, c.post_count, c.is_archived, c.created_at,
         c.owner_id, u.name, u.profile_image,
         exists (select 1 from public.community_members m
                  where m.community_id = c.id and m.user_id = auth.uid()),
         (c.owner_id = auth.uid()),
         (not c.is_archived and exists (
            select 1 from public.community_members m
             where m.community_id = c.id and m.user_id = auth.uid())),
         c.visibility,
         -- The page still loads for a non-member of a private group: they get
         -- the name, the description and a way in. This flag is what tells the
         -- UI to render that instead of the posts.
         public.can_view_community(c.id, auth.uid()),
         exists (select 1 from public.community_join_requests r
                  where r.community_id = c.id and r.user_id = auth.uid()
                    and r.status = 'pending'),
         exists (select 1 from public.community_invites i
                  where i.community_id = c.id and i.invited_user_id = auth.uid()
                    and i.status = 'pending'),
         (select count(*)::integer from public.community_join_requests r
           where r.community_id = c.id and r.status = 'pending'
             and (c.owner_id = auth.uid() or public.is_admin_user(auth.uid())))
    from public.communities c
    left join public.users u on u.id = c.owner_id
   where c.slug = p_slug;
$$;

-- What the owner sees on their group's "requests" panel.
create or replace function public.list_join_requests(p_community_id uuid)
returns table (
  id uuid, user_id uuid, name text, profile_image text,
  is_mentor boolean, message text, created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.id, r.user_id, u.name, u.profile_image,
         public.is_active_mentor(r.user_id), r.message, r.created_at
    from public.community_join_requests r
    left join public.users u on u.id = r.user_id
   where r.community_id = p_community_id
     and r.status = 'pending'
     and (public.is_community_owner(p_community_id, auth.uid())
          or public.is_admin_user(auth.uid()))
   order by r.created_at asc;
$$;

revoke all on function public.list_join_requests(uuid) from public, anon;
grant execute on function public.list_join_requests(uuid) to authenticated;

-- What a student sees in their own notifications area.
create or replace function public.list_my_invites()
returns table (
  id uuid, community_id uuid, community_name text, community_slug text,
  invited_by_name text, created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select i.id, i.community_id, c.name, c.slug, u.name, i.created_at
    from public.community_invites i
    join public.communities c on c.id = i.community_id
    left join public.users u on u.id = i.invited_by
   where i.invited_user_id = auth.uid()
     and i.status = 'pending'
     and not c.is_archived
   order by i.created_at desc;
$$;

revoke all on function public.list_my_invites() from public, anon;
grant execute on function public.list_my_invites() to authenticated;
