
-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('profiles', 'profiles', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload profile images (for profiles bucket)
CREATE POLICY "Allow authenticated users to upload profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = 'profile-images'
);

-- Allow authenticated users to select profile images (for profiles bucket)
CREATE POLICY "Allow authenticated users to select profile images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = 'profile-images'
);

-- Allow public to view profile images
CREATE POLICY "Allow public to view profile images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = 'profile-images'
);
