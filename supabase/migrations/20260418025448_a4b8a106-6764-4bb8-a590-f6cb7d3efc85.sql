-- 1. Remove overly permissive INSERT policy on marketplace_posts (WITH CHECK true)
DROP POLICY IF EXISTS "Authenticated users can create marketplace posts" ON public.marketplace_posts;
-- The stricter policy "Authenticated users can create marketplace posts with user_id" remains
-- and enforces auth.uid() = user_id.

-- 2. Restrict listing on public storage buckets to authenticated users
-- Public read of individual objects still works via existing public bucket policies.

-- profile-images
DROP POLICY IF EXISTS "Authenticated can list profile-images" ON storage.objects;
CREATE POLICY "Authenticated can list profile-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'profile-images');

-- team_members
DROP POLICY IF EXISTS "Authenticated can list team_members" ON storage.objects;
CREATE POLICY "Authenticated can list team_members"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'team_members');

-- marketplace
DROP POLICY IF EXISTS "Authenticated can list marketplace" ON storage.objects;
CREATE POLICY "Authenticated can list marketplace"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'marketplace');

-- Community Post Images
DROP POLICY IF EXISTS "Authenticated can list community post images" ON storage.objects;
CREATE POLICY "Authenticated can list community post images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'Community Post Images');
