
-- Update the trigger function to insert into both users and mentors tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table (existing logic)
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'display_name',
      NEW.email
    ),
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name', 
      EXCLUDED.name,
      NEW.email
    );

  -- Also insert into mentors table with default values
  INSERT INTO public.mentors (
    id, 
    name, 
    department, 
    skills, 
    bio, 
    linkedin_url, 
    profile_image, 
    rating, 
    review_count
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'display_name',
      NEW.email
    ),
    'General',
    ARRAY[]::text[],
    NULL,
    NULL,
    NEW.raw_user_meta_data->>'avatar_url',
    0,
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name', 
      EXCLUDED.name,
      NEW.email
    ),
    profile_image = COALESCE(NEW.raw_user_meta_data->>'avatar_url', EXCLUDED.profile_image);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add existing users to mentors table (one-time migration)
INSERT INTO public.mentors (
  id, 
  name, 
  department, 
  skills, 
  bio, 
  linkedin_url, 
  profile_image, 
  rating, 
  review_count
)
SELECT 
  u.id,
  u.name,
  COALESCE(u.department, 'General'),
  COALESCE(u.skills, ARRAY[]::text[]),
  u.bio,
  u.linkedin_url,
  u.profile_image,
  0,
  0
FROM public.users u
WHERE u.id NOT IN (SELECT id FROM public.mentors)
ON CONFLICT (id) DO NOTHING;
