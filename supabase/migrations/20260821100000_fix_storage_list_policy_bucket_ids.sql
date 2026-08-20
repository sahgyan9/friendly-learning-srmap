-- 20260418025448_a4b8a106-...sql created four "Authenticated can list <bucket>"
-- SELECT policies by writing bucket_id literals for team_members and
-- marketplace (whose id equals their display name -- those work), but for the
-- other two it used the dashboard *display name* instead of the bucket's
-- actual id. storage.buckets has separate id/name columns and RLS keys off
-- id; confirmed live via `SELECT id, name FROM storage.buckets`:
--
--   id               | name
--   community-posts  | Community Post Images
--   profiles         | profile-images
--
-- so both policies below matched zero rows -- harmless no-ops only because
-- "Anyone can view profile images" / "Community post images are publicly
-- accessible" (untracked, dashboard-created public SELECT policies) already
-- cover reads for every role including authenticated. Writes were never
-- affected: 20260804132345_...sql's owner-scoped INSERT/UPDATE/DELETE
-- policies already use the correct ids.
DROP POLICY IF EXISTS "Authenticated can list community post images" ON storage.objects;
CREATE POLICY "Authenticated can list community post images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'community-posts');

DROP POLICY IF EXISTS "Authenticated can list profile-images" ON storage.objects;
CREATE POLICY "Authenticated can list profile-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profiles');
