-- Fix Clubs & Student Societies display on Mentor Profiles
--
-- Why this is needed:
-- 20260821230000_grant_audit_fix.sql revoked SELECT on public.community_members
-- under the assumption that all reads went through get_community_members.
-- However, getUserJoinedCommunities(userId) and MentorClubsSection query
-- public.community_members directly, which caused PostgREST to return 42501
-- (permission denied), resulting in empty clubs/societies for all profiles.
--
-- This migration:
-- 1. Restores SELECT permission on public.community_members to anon and authenticated
--    (protected by the existing RLS policy "Anyone can view members").
-- 2. Provides a robust SECURITY DEFINER RPC get_user_joined_communities(p_user_id)
--    for fetching a user's joined communities with visibility rules enforced.

-- 1. Restore table-level SELECT on community_members
GRANT SELECT ON public.community_members TO anon, authenticated;

-- 2. Create get_user_joined_communities RPC
CREATE OR REPLACE FUNCTION public.get_user_joined_communities(p_user_id uuid)
RETURNS TABLE (
  community_id uuid,
  community_name text,
  community_slug text,
  community_kind text,
  community_cover_image text,
  community_member_count integer,
  role text,
  joined_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    c.id AS community_id,
    c.name AS community_name,
    c.slug AS community_slug,
    c.kind AS community_kind,
    c.cover_image AS community_cover_image,
    c.member_count AS community_member_count,
    m.role,
    m.joined_at
  FROM public.community_members m
  JOIN public.communities c ON c.id = m.community_id
  WHERE m.user_id = p_user_id
    AND (
      c.visibility = 'public'
      OR (
        auth.uid() IS NOT NULL
        AND (
          c.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.community_id = c.id AND cm.user_id = auth.uid()
          )
          OR public.is_admin_user(auth.uid())
        )
      )
    )
  ORDER BY m.joined_at ASC;
$$;

COMMENT ON FUNCTION public.get_user_joined_communities(uuid) IS
  'Returns public and visible communities/clubs a student has joined for profile display.';

REVOKE ALL ON FUNCTION public.get_user_joined_communities(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_joined_communities(uuid) TO anon, authenticated;
