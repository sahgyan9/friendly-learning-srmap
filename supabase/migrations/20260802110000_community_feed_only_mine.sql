-- "Only mine" on the posts board, matching the same filter on Groups.
--
-- Has to be a drop-and-create rather than CREATE OR REPLACE: adding p_mine
-- changes the function's identity arguments, and REPLACE cannot do that. It
-- would instead leave a second overload behind, and a five-argument call could
-- then match either one -- PostgREST answers that ambiguity with an error.
--
-- p_mine is last and defaults to false, so the build in production at the time
-- this shipped, which sends the five named arguments it always has, kept working
-- untouched. Verified against production in a rolled-back transaction: as the
-- author of the two board posts, mine=true returned both; as a different user it
-- returned none; and the positional five-argument call returned both either way.
--
-- The auth.uid() is not null guard matters: without it a signed-out caller
-- asking for p_mine => true would compare author_id to NULL, which is never
-- true, and they would get an empty feed rather than the flag being ignored.

drop function if exists public.get_community_feed(text, text, integer, integer, uuid);

create function public.get_community_feed(
  p_post_type text default null,
  p_search text default null,
  p_limit integer default 20,
  p_offset integer default 0,
  p_community_id uuid default null,
  p_mine boolean default false
)
returns table(id uuid, title text, content text, post_type text, status text, tags text[],
  image_url text, likes_count integer, comments_count integer, created_at timestamptz,
  updated_at timestamptz, author_id uuid, author_name text, author_image text,
  author_department text, author_role text, author_is_mentor boolean, viewer_has_liked boolean,
  viewer_is_author boolean, community_id uuid, community_name text, community_slug text,
  total_count bigint)
language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  with filtered as (
    select p.*
      from public.community_posts p
     where (
             (p_community_id is null and p.community_id is null)
             or (p_community_id is not null and p.community_id = p_community_id)
           )
       and (p.community_id is null or public.can_view_community(p.community_id, auth.uid()))
       and (p_post_type is null or p_post_type = 'all' or p.post_type = p_post_type)
       and (not coalesce(p_mine, false) or (auth.uid() is not null and p.author_id = auth.uid()))
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
$function$;

comment on function public.get_community_feed(text, text, integer, integer, uuid, boolean) is
  'Paginated post feed. p_community_id null reads the public board; p_mine limits it to the caller''s own posts.';

grant execute on function public.get_community_feed(text, text, integer, integer, uuid, boolean)
  to anon, authenticated, service_role;
