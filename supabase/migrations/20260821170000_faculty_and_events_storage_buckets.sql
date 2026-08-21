-- Migration: 20260821170000_faculty_and_events_storage_buckets.sql
-- Description: Create dedicated public storage buckets for faculty portraits and university event images.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('faculty-portraits', 'faculty-portraits', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('event-images', 'event-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 1. Public read policies
DROP POLICY IF EXISTS "Public can view faculty portraits" ON storage.objects;
CREATE POLICY "Public can view faculty portraits"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'faculty-portraits');

DROP POLICY IF EXISTS "Public can view event images" ON storage.objects;
CREATE POLICY "Public can view event images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'event-images');

-- 2. Authenticated admin management policies for faculty portraits
DROP POLICY IF EXISTS "Admins can insert faculty portraits" ON storage.objects;
CREATE POLICY "Admins can insert faculty portraits"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'faculty-portraits' AND public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can update faculty portraits" ON storage.objects;
CREATE POLICY "Admins can update faculty portraits"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'faculty-portraits' AND public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete faculty portraits" ON storage.objects;
CREATE POLICY "Admins can delete faculty portraits"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'faculty-portraits' AND public.is_admin_user(auth.uid()));

-- 3. Authenticated admin management policies for event images
DROP POLICY IF EXISTS "Admins can insert event images" ON storage.objects;
CREATE POLICY "Admins can insert event images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-images' AND public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can update event images" ON storage.objects;
CREATE POLICY "Admins can update event images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-images' AND public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete event images" ON storage.objects;
CREATE POLICY "Admins can delete event images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-images' AND public.is_admin_user(auth.uid()));
