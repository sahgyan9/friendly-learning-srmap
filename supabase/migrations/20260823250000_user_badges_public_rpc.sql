-- Read a user's badges without touching public.users.
--
-- Every anonymous view of /mentor/<id> logged this, three times over:
--
--   Error fetching badges:      {code: 42501, permission denied for table users}
--   Error fetching user badges: {code: 42501, permission denied for table users}
--   Failed to load resource: the server responded with a status of 401
--
-- The cause was one line in src/integrations/supabase/services/badges.ts:
--
--   awarder:users!user_badges_awarded_by_fkey(name)
--
-- public.users grants SELECT to the owner only -- deliberately, because the row
-- also carries email, mobile, College ID and CGPA (see the reasoning in
-- 20260730200000_chat_participant_profiles.sql). PostgREST resolves an embed as
-- part of the same statement, so the whole query was rejected, not just the
-- embedded column. badge_types and user_badges are both world-readable and were
-- never the problem.
--
-- The UI degraded quietly -- BadgeDisplay renders "No badges earned yet" on an
-- empty list, and an error looks exactly like an empty list -- so a signed-in
-- admin would never see this, and no mentor's badges have ever rendered to a
-- visitor who was not signed in.
--
-- The fix is not a policy opening up public.users. It is this: return the
-- fields a badge actually displays, and nothing else.

create or replace function public.user_badges_public(p_user_id uuid)
returns table (
  id                uuid,
  user_id           uuid,
  badge_type_id     uuid,
  awarded_by        uuid,
  awarded_at        timestamptz,
  notes             text,
  awarded_by_name   text,
  badge_name        text,
  badge_description text,
  badge_icon        text,
  badge_color       text,
  badge_category    text,
  badge_created_at  timestamptz,
  badge_updated_at  timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select ub.id,
         ub.user_id,
         ub.badge_type_id,
         ub.awarded_by,
         ub.awarded_at,
         ub.notes,
         -- The only field here that needs SECURITY DEFINER. It is a display
         -- name and nothing else: no email, no mobile, no College ID, no CGPA.
         -- It is also not a directory -- p_user_id selects badge rows, and the
         -- only names reachable are those of people who have awarded a badge,
         -- which today means admins and the auto-award job (which leaves
         -- awarded_by null). You cannot ask this function about an arbitrary
         -- uuid's name; you can only learn who awarded a badge that is already
         -- public.
         awarder.name as awarded_by_name,
         bt.name,
         bt.description,
         bt.icon,
         bt.color,
         bt.category,
         bt.created_at,
         bt.updated_at
    from public.user_badges ub
    left join public.badge_types bt on bt.id = ub.badge_type_id
    left join public.users awarder  on awarder.id = ub.awarded_by
   where ub.user_id = p_user_id
   order by ub.awarded_at desc;
$$;

comment on function public.user_badges_public(uuid) is
  'Badges held by one user, with the badge type inlined and the awarder''s display name. Exists so the public mentor profile does not have to SELECT from public.users, which is owner-only. Returns no email, mobile, college_id or cgpa.';

-- Supabase grants EXECUTE on new functions to anon and authenticated by
-- default, and revoking from PUBLIC alone does not remove those.
revoke all on function public.user_badges_public(uuid) from public, anon, authenticated;
grant execute on function public.user_badges_public(uuid) to anon, authenticated;

-- The lookup is by user_id, which had no index of its own: the table's only
-- index was the UNIQUE (user_id, badge_type_id) constraint, which does serve
-- this prefix -- so this is belt and braces rather than a fix, and is cheap
-- enough at this table's size to be worth the explicitness.
create index if not exists user_badges_user_id_awarded_at_idx
  on public.user_badges (user_id, awarded_at desc);
