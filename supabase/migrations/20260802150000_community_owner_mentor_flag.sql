-- ---------------------------------------------------------------------------
-- "Run by <name>" stopped being a link when groups stopped being mentor-only
-- (dfa32ea): the owner is no longer guaranteed to have a /mentor/:id page,
-- and a name that links to a 404 is worse than one that doesn't link at all.
-- That was the right call at the time, but it also unlinked the (still
-- common) case where the owner genuinely is a mentor. Adding the same
-- is_active_mentor flag get_community_members already exposes lets the UI
-- link only when the destination actually exists.
-- ---------------------------------------------------------------------------

drop function if exists public.get_community(text);

create or replace function public.get_community(p_slug text)
returns table (
  id uuid, slug text, name text, description text, kind text, cover_image text,
  member_count integer, post_count integer, is_archived boolean,
  created_at timestamptz, owner_id uuid, owner_name text, owner_image text,
  owner_is_mentor boolean,
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
$$;

grant execute on function public.get_community(text) to anon, authenticated;
