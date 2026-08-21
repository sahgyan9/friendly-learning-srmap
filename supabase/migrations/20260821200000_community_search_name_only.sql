-- Group search matches on name only, not description.
--
-- list_communities matched `name ilike` OR `description ilike` with no
-- relevance ranking between the two (order was purely last_activity_at,
-- member_count, created_at). A generic word buried in a group's description
-- could therefore outrank a group actually named for that word, or surface a
-- group with no real connection to what was typed. People recall groups by
-- their name/header ("MediConnect", "Wellness Club"), not by what happens to
-- be written inside them — topic-based discovery for that case belongs to
-- the semantic-search path (search_knowledge / knowledge_chunks), which
-- already exists for exactly this purpose.
--
-- CREATE OR REPLACE is safe here: the return signature is unchanged from
-- 20260807130000_community_last_activity.sql, only the WHERE clause's search
-- condition changes, so the function's grants are not dropped and do not
-- need to be reissued.

create or replace function public.list_communities(
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
   order by a.last_activity_at desc, f.member_count desc, f.created_at desc
   limit greatest(least(p_limit, 60), 1)
  offset greatest(p_offset, 0);
$function$;
