-- How many posts each category actually holds.
--
-- The board shows eight category chips in two rows, every one of them the same
-- size and weight, and most of them lead to an empty page. That is eight
-- decisions asked of someone who came to read two posts, and seven of them are
-- dead ends they can only discover by tapping.
--
-- With counts the UI can show the categories that have something in them and
-- fold the rest away, which is a much smaller ask and never hides a category
-- that would have shown a result.
--
-- SECURITY INVOKER on purpose. This must count exactly what the caller is
-- allowed to read, and the existing SELECT policy on community_posts already
-- says what that is. A SECURITY DEFINER version would be a second, separate
-- statement of the same rule, free to drift out of step with the first.
--
-- The community_id filter keeps this to the public board. Group posts live in
-- the same table and belong to their own group's feed, never to this one.

create or replace function public.community_post_type_counts()
returns table (post_type text, post_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select p.post_type, count(*) as post_count
    from public.community_posts p
   where p.community_id is null
   group by p.post_type;
$$;

comment on function public.community_post_type_counts() is
  'Post count per category on the public board, so the filter chips can show what is worth tapping.';

grant execute on function public.community_post_type_counts() to anon, authenticated;
