-- Groups report recency, not totals.
--
-- "34 discussions" is a number this product does not have; "active 2 hours ago"
-- is a number it does, and it is the one that tells a student whether walking
-- into a group is worth it. Both community RPCs gain last_activity_at, and the
-- list orders by it, so a group that was talked in today outranks a bigger one
-- that has been silent since it was created.
--
-- The value is the newest of: last chat message, last post, and the group's own
-- creation. Falling back to created_at means the column is never null, so the UI
-- never has to render "never" — a brand new group reads as "created just now",
-- which is true and not discouraging.
--
-- Both functions are DROPped rather than CREATE OR REPLACEd: adding a column to
-- a RETURNS TABLE changes the return type, which replace cannot do. That drops
-- the grants with them, so they are re-issued at the bottom. Note the REVOKE —
-- a newly created function is EXECUTEable by PUBLIC by default, and PUBLIC
-- outranks any per-role revoke.

drop function if exists public.list_communities(text, text, boolean, integer, integer);

create function public.list_communities(
  p_search text default null,
  p_kind text default null,
  p_mine boolean default false,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  name text,
  description text,
  kind text,
  cover_image text,
  member_count integer,
  post_count integer,
  is_archived boolean,
  created_at timestamptz,
  last_activity_at timestamptz,
  owner_id uuid,
  owner_name text,
  owner_image text,
  viewer_is_member boolean,
  viewer_is_owner boolean,
  visibility text,
  viewer_has_requested boolean,
  viewer_has_invite boolean,
  total_count bigint
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
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
  ),
  activity as (
    select f.id,
           greatest(
             f.created_at,
             coalesce((select max(g.created_at) from public.community_group_messages g
                        where g.community_id = f.id), f.created_at),
             coalesce((select max(p.created_at) from public.community_posts p
                        where p.community_id = f.id), f.created_at)
           ) as last_activity_at
      from filtered f
  )
  select f.id, f.slug, f.name, f.description, f.kind, f.cover_image,
         f.member_count, f.post_count, f.is_archived, f.created_at,
         a.last_activity_at,
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
    join activity a on a.id = f.id
    left join public.users u on u.id = f.owner_id
   -- Recency first. member_count stays as the tiebreaker so that among groups
   -- that have never been talked in, the fuller one still surfaces.
   order by a.last_activity_at desc, f.member_count desc, f.created_at desc
   limit greatest(least(p_limit, 60), 1)
  offset greatest(p_offset, 0);
$function$;

drop function if exists public.get_community(text);

create function public.get_community(p_slug text)
returns table (
  id uuid,
  slug text,
  name text,
  description text,
  kind text,
  cover_image text,
  member_count integer,
  post_count integer,
  is_archived boolean,
  created_at timestamptz,
  last_activity_at timestamptz,
  owner_id uuid,
  owner_name text,
  owner_image text,
  owner_is_mentor boolean,
  viewer_is_member boolean,
  viewer_is_owner boolean,
  viewer_can_post boolean,
  visibility text,
  viewer_can_view boolean,
  viewer_has_requested boolean,
  viewer_has_invite boolean,
  pending_request_count integer
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select c.id, c.slug, c.name, c.description, c.kind, c.cover_image,
         c.member_count, c.post_count, c.is_archived, c.created_at,
         greatest(
           c.created_at,
           coalesce((select max(g.created_at) from public.community_group_messages g
                      where g.community_id = c.id), c.created_at),
           coalesce((select max(p.created_at) from public.community_posts p
                      where p.community_id = c.id), c.created_at)
         ),
         c.owner_id, u.name, u.profile_image,
         public.is_active_mentor(c.owner_id),
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
$function$;

revoke all on function public.list_communities(text, text, boolean, integer, integer) from public;
revoke all on function public.get_community(text) from public;

grant execute on function public.list_communities(text, text, boolean, integer, integer)
  to anon, authenticated, service_role;
grant execute on function public.get_community(text)
  to anon, authenticated, service_role;
