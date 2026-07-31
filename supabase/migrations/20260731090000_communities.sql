-- Communities: groups a mentor starts and students join.
--
-- Distinct from the posts board. The board is one shared room everybody shouts
-- into; a community is a named group with a member list, its own posts, and a
-- mentor responsible for it. Starting one is a mentor privilege, which is both
-- the point (it is a reason to become a mentor) and the safeguard (someone is
-- accountable for what happens inside).
--
-- Two decisions are baked in here, and reversing either is a migration rather
-- than a config change:
--
--   1. Anyone signed in can join. There is no approval queue. With a handful of
--      users a queue means groups sit empty waiting on one person to be online.
--
--   2. Group posts are world-readable, exactly like board posts. Membership
--      controls who can WRITE, not who can READ. The SELECT policies on
--      community_posts, post_comments and post_likes are all literally `true`
--      today, so making group content private means rewriting all three such
--      that nothing can fall out of any of them. That is real work with a real
--      leak risk, and it is not this migration.
--
-- Posts live in the existing community_posts table behind a community_id rather
-- than in a parallel set of tables, so comments, likes, images and the feed RPC
-- all come along for free. The only rule that changes is who may insert.

-- ---------------------------------------------------------------------------
-- Slugs
-- ---------------------------------------------------------------------------

create or replace function public.slugify(p_text text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

comment on function public.slugify(text) is
  'Lowercase, hyphen-separated, ASCII only. Used for community URLs.';

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (char_length(btrim(name)) between 3 and 80),
  description text not null check (char_length(btrim(description)) between 20 and 2000),
  -- Mirrors the vocabulary the posts board already uses, so a student meets the
  -- same words in both places.
  kind text not null default 'general'
    check (kind in ('hackathon', 'project', 'club', 'study', 'research', 'general')),
  owner_id uuid not null references public.users(id) on delete cascade,
  cover_image text,
  -- Denormalised so a list of twenty groups is one query, not forty-one.
  member_count int not null default 0,
  post_count int not null default 0,
  -- Archived groups stay readable at their URL but stop accepting members and
  -- posts. Deleting would take the conversation with it.
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communities_owner_idx on public.communities (owner_id);
create index if not exists communities_kind_idx on public.communities (kind) where not is_archived;

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index if not exists community_members_user_idx on public.community_members (user_id);

-- One owner row per community, enforced rather than assumed.
create unique index if not exists community_members_single_owner_idx
  on public.community_members (community_id) where role = 'owner';

alter table public.community_posts
  add column if not exists community_id uuid references public.communities(id) on delete cascade;

-- The board reads `community_id is null` on every page load and a group page
-- reads one id at a time. Both want this.
create index if not exists community_posts_community_idx
  on public.community_posts (community_id, created_at desc);

comment on column public.community_posts.community_id is
  'Null means the post is on the public board. Set means it belongs to that community, and only a member could have written it.';

-- ---------------------------------------------------------------------------
-- Helpers used by policies
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so a policy on community_posts can ask about membership
-- without needing its own readable path into community_members.

create or replace function public.is_community_member(p_community_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.community_members m
     where m.community_id = p_community_id
       and m.user_id = p_user_id
  );
$$;

create or replace function public.is_community_owner(p_community_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.communities c
     where c.id = p_community_id
       and c.owner_id = p_user_id
  );
$$;

-- "Mentor" means here what it means everywhere else in the app: a mentors row
-- with a real department. 'General' is the placeholder auto-created rows get
-- and has never counted.
create or replace function public.is_active_mentor(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.mentors m
     where m.id = p_user_id
       and m.department is not null
       and btrim(m.department) <> ''
       and m.department <> 'General'
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.communities_set_slug()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_base text;
  v_slug text;
  v_n int := 1;
begin
  if tg_op = 'UPDATE' and new.name = old.name then
    new.slug := old.slug;  -- renaming is allowed; breaking the URL is not
    return new;
  end if;

  v_base := public.slugify(new.name);
  if v_base = '' then v_base := 'group'; end if;

  v_slug := v_base;
  while exists (select 1 from public.communities c where c.slug = v_slug and c.id <> new.id) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  new.slug := v_slug;
  return new;
end;
$$;

drop trigger if exists communities_slug on public.communities;
create trigger communities_slug
  before insert or update of name on public.communities
  for each row execute function public.communities_set_slug();

-- The creator is a member from the first moment. Without this the owner has to
-- join their own group, and an empty member list on a brand-new group reads as
-- broken.
create or replace function public.communities_add_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.community_members (community_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists communities_owner_membership on public.communities;
create trigger communities_owner_membership
  after insert on public.communities
  for each row execute function public.communities_add_owner_as_member();

create or replace function public.community_members_recount()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.communities set member_count = member_count + 1 where id = new.community_id;
  elsif tg_op = 'DELETE' then
    update public.communities set member_count = greatest(member_count - 1, 0) where id = old.community_id;
  end if;
  return null;
end;
$$;

drop trigger if exists community_members_count on public.community_members;
create trigger community_members_count
  after insert or delete on public.community_members
  for each row execute function public.community_members_recount();

create or replace function public.community_posts_recount()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' and new.community_id is not null then
    update public.communities set post_count = post_count + 1 where id = new.community_id;
  elsif tg_op = 'DELETE' and old.community_id is not null then
    update public.communities set post_count = greatest(post_count - 1, 0) where id = old.community_id;
  end if;
  return null;
end;
$$;

drop trigger if exists community_posts_count on public.community_posts;
create trigger community_posts_count
  after insert or delete on public.community_posts
  for each row execute function public.community_posts_recount();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.communities enable row level security;
alter table public.community_members enable row level security;

-- Read: public, same as the board. A visitor deciding whether this site is
-- worth joining should be able to see that groups exist and have people in them.
drop policy if exists "Anyone can view communities" on public.communities;
create policy "Anyone can view communities"
  on public.communities for select
  using (true);

drop policy if exists "Mentors can create a community" on public.communities;
create policy "Mentors can create a community"
  on public.communities for insert
  to authenticated
  with check (owner_id = auth.uid() and public.is_active_mentor(auth.uid()));

drop policy if exists "Owners can update their community" on public.communities;
create policy "Owners can update their community"
  on public.communities for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners can delete their community" on public.communities;
create policy "Owners can delete their community"
  on public.communities for delete
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Admins can moderate communities" on public.communities;
create policy "Admins can moderate communities"
  on public.communities for all
  to authenticated
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

drop policy if exists "Anyone can view members" on public.community_members;
create policy "Anyone can view members"
  on public.community_members for select
  using (true);

-- Joining yourself, or the owner adding somebody. Neither can mint an owner
-- row: that is the creation trigger's job alone.
drop policy if exists "Join a community, or be added by its owner" on public.community_members;
create policy "Join a community, or be added by its owner"
  on public.community_members for insert
  to authenticated
  with check (
    role = 'member'
    and (user_id = auth.uid() or public.is_community_owner(community_id, auth.uid()))
    and exists (
      select 1 from public.communities c
       where c.id = community_id and not c.is_archived
    )
  );

-- Leaving, or the owner removing somebody. The owner row is not removable, so a
-- community can never end up with nobody responsible for it.
drop policy if exists "Leave a community, or be removed by its owner" on public.community_members;
create policy "Leave a community, or be removed by its owner"
  on public.community_members for delete
  to authenticated
  using (
    role <> 'owner'
    and (user_id = auth.uid() or public.is_community_owner(community_id, auth.uid()))
  );

-- Posting: unchanged for the board, members-only inside a group.
drop policy if exists "Authenticated users can create posts" on public.community_posts;
create policy "Authenticated users can create posts"
  on public.community_posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (
      community_id is null
      or (
        public.is_community_member(community_id, auth.uid())
        and exists (select 1 from public.communities c where c.id = community_id and not c.is_archived)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Reading communities
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER because each of these joins public.users for a name, and
-- users is owner-only readable by design (it holds email, mobile, college_id
-- and CGPA). These return name and photo, nothing else.

create or replace function public.list_communities(
  p_search text default null,
  p_kind text default null,
  p_mine boolean default false,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid, slug text, name text, description text, kind text, cover_image text,
  member_count int, post_count int, is_archived boolean, created_at timestamptz,
  owner_id uuid, owner_name text, owner_image text,
  viewer_is_member boolean, viewer_is_owner boolean, total_count bigint
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
         (select count(*) from filtered)
    from filtered f
    left join public.users u on u.id = f.owner_id
   order by f.member_count desc, f.created_at desc
   limit greatest(least(p_limit, 60), 1)
  offset greatest(p_offset, 0);
$$;

create or replace function public.get_community(p_slug text)
returns table (
  id uuid, slug text, name text, description text, kind text, cover_image text,
  member_count int, post_count int, is_archived boolean, created_at timestamptz,
  owner_id uuid, owner_name text, owner_image text,
  viewer_is_member boolean, viewer_is_owner boolean, viewer_can_post boolean
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
             where m.community_id = c.id and m.user_id = auth.uid()))
    from public.communities c
    left join public.users u on u.id = c.owner_id
   where c.slug = p_slug;
$$;

create or replace function public.get_community_members(
  p_community_id uuid,
  p_limit int default 50
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
   order by (m.role = 'owner') desc, m.joined_at asc
   limit greatest(least(p_limit, 200), 1);
$$;

-- Who an owner may add by hand.
--
-- Deliberately not a search over every user on the platform. public.users is
-- owner-only readable precisely so that one account cannot enumerate the
-- student body, and being a community owner is not a reason to undo that. So
-- the pool is: mentors, whose names are already public, and people the owner
-- has actually had a conversation with. Everyone else joins the group
-- themselves, which is the normal path anyway since joining is open.
create or replace function public.community_addable_users(
  p_community_id uuid,
  p_search text default null,
  p_limit int default 10
)
returns table (user_id uuid, name text, profile_image text, is_mentor boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.id, u.name, u.profile_image, public.is_active_mentor(u.id)
    from public.users u
   where public.is_community_owner(p_community_id, auth.uid())
     and u.id <> auth.uid()
     and not exists (
       select 1 from public.community_members m
        where m.community_id = p_community_id and m.user_id = u.id
     )
     and (
       public.is_active_mentor(u.id)
       or exists (
         select 1 from public.conversations c
          where (c.user1_id = auth.uid() and c.user2_id = u.id)
             or (c.user2_id = auth.uid() and c.user1_id = u.id)
       )
     )
     and (
       p_search is null or btrim(p_search) = ''
       or u.name ilike '%' || p_search || '%'
     )
   order by u.name asc
   limit greatest(least(p_limit, 25), 1);
$$;

-- ---------------------------------------------------------------------------
-- The feed, taught about communities
-- ---------------------------------------------------------------------------
-- Without this the board would start showing every group's posts, which is the
-- closest thing to a leak this design has. A NULL p_community_id means "the
-- public board", which is the behaviour every existing caller already wants.

drop function if exists public.get_community_feed(text, text, integer, integer);

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

drop function if exists public.get_community_post(uuid);

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
   where p.id = p_post_id;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant execute on function public.list_communities(text, text, boolean, int, int) to anon, authenticated;
grant execute on function public.get_community(text) to anon, authenticated;
grant execute on function public.get_community_members(uuid, int) to anon, authenticated;
grant execute on function public.community_addable_users(uuid, text, int) to authenticated;
grant execute on function public.get_community_feed(text, text, integer, integer, uuid) to anon, authenticated;
grant execute on function public.get_community_post(uuid) to anon, authenticated;
grant execute on function public.is_community_member(uuid, uuid) to anon, authenticated;
grant execute on function public.is_community_owner(uuid, uuid) to anon, authenticated;
grant execute on function public.is_active_mentor(uuid) to anon, authenticated;
