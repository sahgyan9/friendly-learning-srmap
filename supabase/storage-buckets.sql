
-- Create a storage bucket for profile images
INSERT INTO storage.buckets (id, name, public) VALUES ('profiles', 'Profile Images', true);

-- Create RLS policy to allow authenticated users to upload their own profile images
CREATE POLICY "Users can upload their own profile images" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'profiles' AND (auth.uid())::text = SUBSTRING(name FROM 'profile-images/([^-]+)-'));

-- Create RLS policy to allow public access to profile images
CREATE POLICY "Profile images are publicly accessible" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'profiles');

-- Create RLS policy to allow users to update their own profile images
CREATE POLICY "Users can update their own profile images" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'profiles' AND (auth.uid())::text = SUBSTRING(name FROM 'profile-images/([^-]+)-'));

-- Create RLS policy to allow users to delete their own profile images
CREATE POLICY "Users can delete their own profile images" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'profiles' AND (auth.uid())::text = SUBSTRING(name FROM 'profile-images/([^-]+)-'));
