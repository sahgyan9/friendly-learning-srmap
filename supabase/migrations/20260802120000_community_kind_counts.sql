-- How many live groups each kind actually holds.
--
-- Same problem as the post-type chips: six kind chips at equal weight, most of
-- which can easily be empty on a young site, and a visitor cannot tell which
-- lead anywhere without tapping each one.
--
-- SECURITY INVOKER on purpose. This must count exactly what the caller is
-- allowed to read, and the existing "Anyone can view communities" policy
-- already says that is everyone — so this mirrors that rather than restating
-- it.
--
-- Archived groups are excluded: they no longer appear in the listing itself
-- (see list_communities), so counting them would advertise a chip that leads
-- to nothing.

create or replace function public.community_kind_counts()
returns table (kind text, group_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select c.kind, count(*) as group_count
    from public.communities c
   where not c.is_archived
   group by c.kind;
$$;

comment on function public.community_kind_counts() is
  'Live group count per kind, so the Groups page filter chips can show what is worth tapping.';

grant execute on function public.community_kind_counts() to anon, authenticated;
